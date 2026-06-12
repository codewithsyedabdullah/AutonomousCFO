import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { getDb } from '../db/connection';
import { authMiddleware } from '../middleware/auth';
import { config } from '../config';
import { calculateHealthScore } from '../services/healthScore';

const router = Router();
router.use(authMiddleware);

function buildSnapshot(userId: string): string {
  const db = getDb();

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalIncome,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as totalExpenses
    FROM transactions WHERE user_id = ?
  `).get(userId) as any;

  const monthlyData = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
    FROM transactions
    WHERE user_id = ?
    GROUP BY month
    ORDER BY month DESC
    LIMIT 3
  `).all(userId) as any[];

  const avgIncome = monthlyData.length > 0 ? monthlyData.reduce((s, r) => s + (r.income || 0), 0) / monthlyData.length : 0;
  const avgExpenses = monthlyData.length > 0 ? monthlyData.reduce((s, r) => s + (r.expense || 0), 0) / monthlyData.length : 0;
  const savingsRate = avgIncome > 0 ? ((avgIncome - avgExpenses) / avgIncome) * 100 : 0;

  const topCat = db.prepare(`
    SELECT category, SUM(amount) as total
    FROM transactions WHERE user_id = ? AND type = 'expense'
    GROUP BY category ORDER BY total DESC LIMIT 1
  `).get(userId) as any;

  const healthResult = calculateHealthScore(userId);
  const healthScore = healthResult.score;

  const goal = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as any;

  const today = new Date().toISOString().split('T')[0];
  const netWorth = (totals.totalIncome || 0) - (totals.totalExpenses || 0);

  let goalLine = '';
  if (goal) {
    const pct = goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0;
    goalLine = `- Active Goal: ${goal.name} — ${pct}% complete, target ${goal.target_date || 'N/A'}`;
  }

  return `
User's Financial Snapshot (as of ${today}):
- Net Worth: $${Math.round(netWorth * 100) / 100}
- Monthly Income (avg): $${Math.round(avgIncome * 100) / 100}
- Monthly Expenses (avg): $${Math.round(avgExpenses * 100) / 100}
- Top Spending Category: ${topCat ? `${topCat.category} — $${Math.round(topCat.total * 100) / 100}/month` : 'N/A'}
- Savings Rate: ${Math.round(savingsRate * 100) / 100}%
- Health Score: ${healthScore ? `${healthScore.composite}/100 (${healthScore.label} risk)` : 'N/A'}
${goalLine}
`.trim();
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const userId = req.user!.userId;
    const db = getDb();
    const snapshot = buildSnapshot(userId);

    let conversation = db.prepare('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as any;
    let conversationId: string;

    let messages: { role: string; content: string }[] = [];

    if (conversation) {
      conversationId = conversation.id;
      try {
        messages = JSON.parse(conversation.messages_json);
      } catch {
        messages = [];
      }
    } else {
      conversationId = uuidv4();
      db.prepare('INSERT INTO ai_conversations (id, user_id, messages_json) VALUES (?, ?, ?)').run(conversationId, userId, '[]');
    }

    const systemPrompt = `You are the user's personal AI CFO. You have full visibility into their real financial data. NEVER give generic advice. Always cite specific numbers from their data. Flag risks with [⚠ ALERT].

${snapshot}

Rules:
1. Reference the user's specific numbers in every answer
2. Be concise unless asked for detail
3. Proactively flag if savings rate < 10% or debt is mentioned`;

    const isMock = config.AI_API_KEY === 'sk-placeholder-replace-with-real-key';

    if (isMock) {
      const userMsg = { role: 'user', content: message };
      const assistantMsg = {
        role: 'assistant',
        content: `📊 **CFO Analysis**\n\nBased on your financial snapshot:\n- Your net worth is $${snapshot.match(/Net Worth: \$([\d.]+)/)?.[1] || 'N/A'}\n- Monthly income is $${snapshot.match(/Monthly Income \(avg\): \$([\d.]+)/)?.[1] || 'N/A'} vs expenses of $${snapshot.match(/Monthly Expenses \(avg\): \$([\d.]+)/)?.[1] || 'N/A'}\n- Your savings rate is ${snapshot.match(/Savings Rate: ([\d.]+)%/)?.[1] || 'N/A'}%\n\n*This is a mock response. Configure a real AI_API_KEY in .env to get AI-powered insights.*`,
      };

      messages.push(userMsg, assistantMsg);
      db.prepare('UPDATE ai_conversations SET messages_json = ? WHERE id = ?').run(JSON.stringify(messages), conversationId);

      res.json({ response: assistantMsg.content });
      return;
    }

    const openai = new OpenAI({ apiKey: config.AI_API_KEY, baseURL: 'https://openrouter.ai/api/v1' });
    const apiMessages: any[] = [{ role: 'system', content: systemPrompt }];

    for (const msg of messages) {
      apiMessages.push({ role: msg.role, content: msg.content });
    }
    apiMessages.push({ role: 'user', content: message });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create({
      model: config.AI_MODEL,
      messages: apiMessages,
      stream: true,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        res.write(content);
      }
    }

    res.end();

    const userMsg = { role: 'user', content: message };
    const assistantMsg = { role: 'assistant', content: fullResponse };
    messages.push(userMsg, assistantMsg);
    db.prepare('UPDATE ai_conversations SET messages_json = ? WHERE id = ?').run(JSON.stringify(messages), conversationId);
  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.end();
    }
  }
});

export default router;
