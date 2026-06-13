import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection';
import { authMiddleware } from '../middleware/auth';
import { config } from '../config';
import { calculatePakistanTax, isDeductible, getFbrSection, getMissedDeductionHints, getDeductibleCategories } from '../services/taxCalculator';

const router = Router();
router.use(authMiddleware);

const CURRENT_TAX_YEAR = 2025;

router.get('/summary', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const db = getDb();

    const incomeTx = db.prepare(
      `SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'income' AND strftime('%Y', date) = ?`
    ).get(userId, String(CURRENT_TAX_YEAR)) as any;

    const allExpenseTx = db.prepare(
      `SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%Y', date) = ? GROUP BY category ORDER BY total DESC`
    ).all(userId, String(CURRENT_TAX_YEAR)) as any[];

    const grossIncome = incomeTx?.total || 0;

    const deductionBreakdown: { category: string; amount: number; deductible: boolean; fbrSection: string }[] = [];
    let totalDeductions = 0;

    for (const row of allExpenseTx) {
      const deductible = isDeductible(row.category);
      if (deductible) {
        totalDeductions += row.total;
      }
      deductionBreakdown.push({
        category: row.category,
        amount: row.total,
        deductible,
        fbrSection: deductible ? getFbrSection(row.category) : 'N/A',
      });
    }

    const taxProfile = db.prepare('SELECT * FROM tax_profiles WHERE user_id = ? AND tax_year = ? ORDER BY created_at DESC LIMIT 1').get(userId, CURRENT_TAX_YEAR) as any;

    const additionalIncome = taxProfile?.additional_income || 0;
    const extraDeductions = taxProfile?.extra_deductions || 0;

    const totalIncome = grossIncome + additionalIncome;
    const taxableIncome = Math.max(0, totalIncome - totalDeductions - extraDeductions);
    const taxLiability = calculatePakistanTax(taxableIncome);
    const effectiveRate = totalIncome > 0 ? (taxLiability / totalIncome) * 100 : 0;

    const missedDeductionHints = getMissedDeductionHints(
      db.prepare(`SELECT * FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%Y', date) = ?`).all(userId, String(CURRENT_TAX_YEAR)),
      allExpenseTx.filter((r) => isDeductible(r.category))
    );

    const alreadyWithheld = 0;
    const refundOrOwed = alreadyWithheld - taxLiability;

    res.json({
      taxYear: CURRENT_TAX_YEAR,
      country: taxProfile?.country || 'PK',
      grossIncome,
      additionalIncome,
      totalIncome,
      totalDeductions,
      extraDeductions,
      taxableIncome,
      taxLiability: Math.round(taxLiability),
      effectiveRate: Math.round(effectiveRate * 100) / 100,
      alreadyWithheld,
      refundOrOwed: Math.round(refundOrOwed),
      deductionBreakdown,
      missedDeductions: missedDeductionHints,
      filingStatus: taxProfile?.filing_status || null,
      dependents: taxProfile?.dependents || 0,
    });
  } catch (err) {
    console.error('Tax summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/profile', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const db = getDb();
    const profile = db.prepare('SELECT * FROM tax_profiles WHERE user_id = ? AND tax_year = ? ORDER BY created_at DESC LIMIT 1').get(userId, CURRENT_TAX_YEAR) as any;
    if (profile) {
      res.json({
        id: profile.id,
        taxYear: profile.tax_year,
        country: profile.country,
        cnic: profile.cnic,
        dependents: profile.dependents,
        additionalIncome: profile.additional_income,
        extraDeductions: profile.extra_deductions,
        exemptionClaims: profile.exemption_claims,
        filingStatus: profile.filing_status,
      });
    } else {
      res.json({ taxYear: CURRENT_TAX_YEAR, country: 'PK' });
    }
  } catch (err) {
    console.error('Tax profile GET error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/profile', (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { country, cnic, dependents, additionalIncome, extraDeductions, exemptionClaims, filingStatus } = req.body;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM tax_profiles WHERE user_id = ? AND tax_year = ?').get(userId, CURRENT_TAX_YEAR) as any;

    if (existing) {
      db.prepare(`UPDATE tax_profiles SET country = ?, cnic = ?, dependents = ?, additional_income = ?, extra_deductions = ?, exemption_claims = ?, filing_status = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(
          country || 'PK',
          cnic || null,
          dependents !== undefined ? parseInt(dependents) : 0,
          additionalIncome !== undefined ? parseFloat(additionalIncome) : 0,
          extraDeductions !== undefined ? parseFloat(extraDeductions) : 0,
          exemptionClaims || null,
          filingStatus || 'individual',
          existing.id
        );
      res.json({ message: 'Profile updated' });
    } else {
      const id = uuidv4();
      db.prepare(`INSERT INTO tax_profiles (id, user_id, tax_year, country, cnic, dependents, additional_income, extra_deductions, exemption_claims, filing_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
          id, userId, CURRENT_TAX_YEAR,
          country || 'PK',
          cnic || null,
          dependents !== undefined ? parseInt(dependents) : 0,
          additionalIncome !== undefined ? parseFloat(additionalIncome) : 0,
          extraDeductions !== undefined ? parseFloat(extraDeductions) : 0,
          exemptionClaims || null,
          filingStatus || 'individual'
        );
      res.status(201).json({ id });
    }
  } catch (err) {
    console.error('Tax profile POST error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/generate-pdf', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const db = getDb();
    const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId) as any;
    const taxProfile = db.prepare('SELECT * FROM tax_profiles WHERE user_id = ? AND tax_year = ? ORDER BY created_at DESC LIMIT 1').get(userId, CURRENT_TAX_YEAR) as any;

    const incomeTx = db.prepare(
      `SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'income' AND strftime('%Y', date) = ?`
    ).get(userId, String(CURRENT_TAX_YEAR)) as any;

    const allExpenseTx = db.prepare(
      `SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%Y', date) = ? GROUP BY category ORDER BY total DESC`
    ).all(userId, String(CURRENT_TAX_YEAR)) as any[];

    const grossIncome = incomeTx?.total || 0;
    let totalDeductions = 0;
    const deductionRows: { category: string; amount: number; deductible: boolean }[] = [];

    for (const row of allExpenseTx) {
      const deductible = isDeductible(row.category);
      if (deductible) totalDeductions += row.total;
      deductionRows.push({ category: row.category, amount: row.total, deductible });
    }

    const additionalIncome = taxProfile?.additional_income || 0;
    const extraDeductions = taxProfile?.extra_deductions || 0;
    const totalIncome = grossIncome + additionalIncome;
    const taxableIncome = Math.max(0, totalIncome - totalDeductions - extraDeductions);
    const taxLiability = calculatePakistanTax(taxableIncome);
    const effectiveRate = totalIncome > 0 ? (taxLiability / totalIncome) * 100 : 0;

    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    let page = doc.addPage([595.28, 841.89]);
    let y = 800;
    const left = 50;
    const fs = (s: number) => s;

    const write = (text: string, size = 10, boldText = false) => {
      const f = boldText ? bold : font;
      page.drawText(text, { x: left, y, size, font: f, color: rgb(0, 0, 0) });
      y -= size + 4;
    };

    const checkSpace = (needed: number) => {
      if (y < needed) { page = doc.addPage([595.28, 841.89]); y = 800; }
    };

    write('AUTO CFO — Tax Return Summary', 18, true);
    write(`${CURRENT_TAX_YEAR}-${String(CURRENT_TAX_YEAR + 1).slice(2)}`, 12);
    write(`Generated: ${new Date().toISOString().split('T')[0]}`, 9);
    y -= 10;

    checkSpace(160);
    write('PERSONAL INFORMATION', 13, true);
    write(`Name: ${user?.name || 'Not provided'}`);
    write(`Email: ${user?.email || 'Not provided'}`);
    write(`CNIC/NTN: ${taxProfile?.cnic || 'Not provided'}`);
    write(`Filing Status: ${taxProfile?.filing_status || 'Individual'}`);
    write(`Dependents: ${taxProfile?.dependents || 0}`);
    y -= 8;

    checkSpace(120);
    write('INCOME SUMMARY', 13, true);
    write(`Gross Annual Income: PKR ${grossIncome.toLocaleString()}`);
    write(`Additional Income: PKR ${additionalIncome.toLocaleString()}`);
    write(`Total Income: PKR ${totalIncome.toLocaleString()}`);
    y -= 8;

    checkSpace(100 + deductionRows.length * 16);
    write('DEDUCTIONS', 13, true);
    write(`Total Deductions: PKR ${totalDeductions.toLocaleString()}`);
    write(`Extra Deductions: PKR ${extraDeductions.toLocaleString()}`);
    for (const r of deductionRows) {
      write(`  ${r.category}: PKR ${r.amount.toLocaleString()} ${r.deductible ? '[Deductible]' : '[Non-deductible]'}`);
    }
    y -= 8;

    checkSpace(120);
    write('TAX CALCULATION', 13, true);
    write(`Taxable Income: PKR ${taxableIncome.toLocaleString()}`);
    write(`Estimated Tax Liability: PKR ${Math.round(taxLiability).toLocaleString()}`);
    write(`Effective Tax Rate: ${effectiveRate.toFixed(2)}%`);
    y -= 8;

    checkSpace(200);
    write('HOW TO FILE ON FBR IRIS', 13, true);
    write('1. Go to https://iris.fbr.gov.pk');
    write('2. Log in with your NTN/CNIC');
    write(`3. Select "Income Tax Return" for Year ${CURRENT_TAX_YEAR}`);
    write(`4. Enter Total Income: PKR ${totalIncome.toLocaleString()}`);
    write(`5. Enter Deductions: PKR ${(totalDeductions + extraDeductions).toLocaleString()}`);
    write(`6. Estimated tax: PKR ${Math.round(taxLiability).toLocaleString()}`);
    write('7. Submit and pay if applicable');
    y -= 8;

    checkSpace(40);
    write('Disclaimer: This summary is for reference only. Verify with a licensed tax professional.', 8);

    const pdfBytes = await doc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="autocfo-tax-summary-${CURRENT_TAX_YEAR}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const userId = req.user!.userId;
    const db = getDb();

    const incomeTx = db.prepare(
      `SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'income' AND strftime('%Y', date) = ?`
    ).get(userId, String(CURRENT_TAX_YEAR)) as any;

    const allExpenseTx = db.prepare(
      `SELECT category, SUM(amount) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%Y', date) = ? GROUP BY category ORDER BY total DESC`
    ).all(userId, String(CURRENT_TAX_YEAR)) as any[];

    const grossIncome = incomeTx?.total || 0;
    let totalDeductions = 0;
    for (const row of allExpenseTx) {
      if (isDeductible(row.category)) totalDeductions += row.total;
    }

    const taxProfile = db.prepare('SELECT * FROM tax_profiles WHERE user_id = ? AND tax_year = ? ORDER BY created_at DESC LIMIT 1').get(userId, CURRENT_TAX_YEAR) as any;
    const additionalIncome = taxProfile?.additional_income || 0;
    const extraDeductions = taxProfile?.extra_deductions || 0;
    const totalIncome = grossIncome + additionalIncome;
    const taxableIncome = Math.max(0, totalIncome - totalDeductions - extraDeductions);
    const taxLiability = calculatePakistanTax(taxableIncome);
    const effectiveRate = totalIncome > 0 ? (taxLiability / totalIncome) * 100 : 0;

    const deductibleExpenses = allExpenseTx.filter((r) => isDeductible(r.category));
    const missedDeductions = getMissedDeductionHints(
      db.prepare(`SELECT * FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%Y', date) = ?`).all(userId, String(CURRENT_TAX_YEAR)),
      deductibleExpenses
    );

    let taxSystemPrompt = `You are the user's personal AI Tax Lawyer specializing in Pakistani tax law (FBR regulations). ONLY answer tax and financial questions. If asked about anything else, politely decline and redirect to tax topics. You have their complete financial picture.

User's Tax Snapshot (${CURRENT_TAX_YEAR}):
- Gross Annual Income: PKR ${grossIncome.toLocaleString()}
- Additional Income: PKR ${additionalIncome.toLocaleString()}
- Total Deductions Claimed: PKR ${totalDeductions.toLocaleString()}
- Taxable Income: PKR ${taxableIncome.toLocaleString()}
- Estimated Tax Liability: PKR ${Math.round(taxLiability).toLocaleString()}
- Effective Tax Rate: ${effectiveRate.toFixed(2)}%
- Filing Status: ${taxProfile?.filing_status || 'Salaried Individual'}
- Dependents: ${taxProfile?.dependents || 0}

Deductible Expenses Tracked:
${deductibleExpenses.map((r) => `- ${r.category}: PKR ${r.total.toLocaleString()}`).join('\n')}

Missed Deductions Spotted:
${missedDeductions.map((d) => '- ' + d).join('\n')}

Rules:
1. Always cite PKR amounts from their actual data (never USD/$)
2. Reference FBR sections when giving deduction advice
3. Keep answers concise — short bullet points, use **bold** for key numbers
4. Never use [SAVE MONEY], [ACTION NEEDED], [No ALERT] or any bracketed tags`;

    const isMock = config.AI_API_KEY === 'sk-placeholder-replace-with-real-key';

    if (isMock) {
      const response = `📋 **Tax Analysis**\n\nBased on your ${CURRENT_TAX_YEAR} tax data:\n- Gross Income: PKR ${grossIncome.toLocaleString()}\n- Deductions: PKR ${totalDeductions.toLocaleString()}\n- Taxable Income: PKR ${taxableIncome.toLocaleString()}\n- Estimated Tax: PKR ${Math.round(taxLiability).toLocaleString()}\n- Effective Rate: ${effectiveRate.toFixed(2)}%\n\n${missedDeductions.length > 0 ? '💡 **Suggestions:**\n' + missedDeductions.map((d) => '- ' + d).join('\n') : ''}\n\n*This is a mock response. Configure a real AI_API_KEY in .env to get AI-powered tax advice.*`;
      res.json({ response });
      return;
    }

    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: config.AI_API_KEY, baseURL: config.AI_API_BASE_URL });

    const completion = await openai.chat.completions.create({
      model: config.AI_MODEL,
      messages: [
        { role: 'system', content: taxSystemPrompt },
        { role: 'user', content: message },
      ],
      stream: false,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, I could not process that request.';
    res.json({ response });
  } catch (err) {
    console.error('Tax chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
