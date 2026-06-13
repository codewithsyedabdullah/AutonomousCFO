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

router.post('/generate-pdf', (req: Request, res: Response) => {
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

    const cnic = taxProfile?.cnic || 'Not provided';
    const filingStatus = taxProfile?.filing_status || 'Individual';
    const dependents = taxProfile?.dependents || 0;

    const pdfContent = `
AUTO CFO Tax Return Summary ${CURRENT_TAX_YEAR}-${String(CURRENT_TAX_YEAR + 1).slice(2)}
================================================================================

GENERATED: ${new Date().toISOString().split('T')[0]}
DISCLAIMER: This is a summary generated by AUTO CFO.
Verify with a licensed tax professional before filing.

PERSONAL INFORMATION
-------------------
Name:                    ${user?.name || 'Not provided'}
Email:                   ${user?.email || 'Not provided'}
CNIC/NTN:                ${cnic}
Filing Status:           ${filingStatus}
Dependents:              ${dependents}

INCOME SUMMARY
--------------
Gross Annual Income:     PKR ${grossIncome.toLocaleString()}
Additional Income:       PKR ${additionalIncome.toLocaleString()}
Total Income:            PKR ${totalIncome.toLocaleString()}

DEDUCTIONS
----------
Total Deductions:        PKR ${totalDeductions.toLocaleString()}
Extra Deductions:        PKR ${extraDeductions.toLocaleString()}

Deduction Breakdown:
${deductionRows.map((r) => `  ${r.category.padEnd(20)} PKR ${r.amount.toLocaleString().padStart(12)}  ${r.deductible ? '✓ Deductible' : '✗ Non-deductible'}`).join('\n')}

TAX CALCULATION
---------------
Taxable Income:          PKR ${taxableIncome.toLocaleString()}
Estimated Tax Liability: PKR ${Math.round(taxLiability).toLocaleString()}
Effective Tax Rate:      ${effectiveRate.toFixed(2)}%

HOW TO FILE ON FBR IRIS
-----------------------
1. Go to https://iris.fbr.gov.pk
2. Log in with your NTN/CNIC
3. Select "Income Tax Return" for Year ${CURRENT_TAX_YEAR}
4. Enter your Personal Information as shown above
5. Enter Total Income: PKR ${totalIncome.toLocaleString()}
6. Enter Deductions: PKR ${(totalDeductions + extraDeductions).toLocaleString()}
7. Your calculated tax liability: PKR ${Math.round(taxLiability).toLocaleString()}
8. Submit and pay if applicable

---
This document was generated by AUTO CFO on ${new Date().toISOString()}
For questions, ask your AI Tax Lawyer in the AUTO CFO chat.
    `.trim();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="autocfo-tax-summary-${CURRENT_TAX_YEAR}.txt"`);
    res.send(pdfContent);
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

    let taxSystemPrompt = `You are the user's personal AI Tax Lawyer specializing in Pakistani tax law (FBR regulations). You have their complete financial picture. Never give generic advice. Always cite their specific numbers and reference the relevant FBR section or Income Tax Ordinance 2001 clause where applicable.

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
1. Always cite PKR amounts from their actual data
2. Reference FBR sections when giving deduction advice
3. Flag with [SAVE MONEY] when you spot a missed deduction
4. Flag with [ACTION NEEDED] when they must do something
5. Remind them you are an AI tool, not a licensed CPA, for any advice that could have legal consequences
6. Keep answers concise — bullet points for action items`;

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
