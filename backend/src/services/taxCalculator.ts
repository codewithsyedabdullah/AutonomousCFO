const DEDUCTIBLE_CATEGORIES = ['Medical', 'Education', 'Zakat', 'Charity', 'Pension', 'Life Insurance', 'Profit on Debt'];

const NON_DEDUCTIBLE = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Subscriptions'];

export function calculatePakistanTax(taxableIncome: number): number {
  const slabs = [
    { min: 0, max: 600000, rate: 0, fixed: 0 },
    { min: 600001, max: 1200000, rate: 0.05, fixed: 0 },
    { min: 1200001, max: 2200000, rate: 0.15, fixed: 30000 },
    { min: 2200001, max: 3200000, rate: 0.25, fixed: 180000 },
    { min: 3200001, max: 4100000, rate: 0.30, fixed: 430000 },
    { min: 4100001, max: Infinity, rate: 0.35, fixed: 700000 },
  ];
  for (const slab of slabs) {
    if (taxableIncome >= slab.min && taxableIncome <= slab.max) {
      return slab.fixed + (taxableIncome - slab.min) * slab.rate;
    }
  }
  return 0;
}

export function getDeductibleCategories(): string[] {
  return [...DEDUCTIBLE_CATEGORIES];
}

export function isDeductible(category: string): boolean {
  return DEDUCTIBLE_CATEGORIES.includes(category);
}

export function getFbrSection(category: string): string {
  const sections: Record<string, string> = {
    Medical: 'Section 60D',
    Education: 'Section 61',
    Zakat: 'Section 60',
    Charity: 'Section 61',
    Pension: 'Section 63',
    'Life Insurance': 'Section 62',
    'Profit on Debt': 'Section 37',
  };
  return sections[category] || 'General deduction';
}

export function getMissedDeductionHints(transactions: any[], deductionCategories: { category: string; amount: number }[]): string[] {
  const hints: string[] = [];
  const dCatSet = new Set(deductionCategories.map((d) => d.category));
  const allDeductibleSpend = transactions.filter(
    (t) => t.type === 'expense' && DEDUCTIBLE_CATEGORIES.includes(t.category)
  );
  const claimedCats = new Set(allDeductibleSpend.map((t) => t.category));
  for (const cat of DEDUCTIBLE_CATEGORIES) {
    if (!claimedCats.has(cat)) {
      hints.push(`You have no ${cat.toLowerCase()} expenses tracked — consider if you have any ${cat.toLowerCase()} payments that could be deductible.`);
    }
  }
  const medicalTotal = deductionCategories.find((d) => d.category === 'Medical');
  if (medicalTotal) {
    hints.push(`You spent PKR ${medicalTotal.amount.toLocaleString()} on medical — claim this under Section 60D.`);
  }
  const zakatTotal = deductionCategories.find((d) => d.category === 'Zakat');
  if (zakatTotal) {
    hints.push(`Zakat of PKR ${zakatTotal.amount.toLocaleString()} is fully deductible under Section 60.`);
  }
  const charityTotal = deductionCategories.find((d) => d.category === 'Charity');
  if (charityTotal) {
    hints.push(`Charity donations of PKR ${charityTotal.amount.toLocaleString()} qualify for deduction under Section 61.`);
  }
  return hints;
}
