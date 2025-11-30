// Mock data for demonstration
export const mockUser = {
  name: "Jordan Smith",
  balance: 1247.50,
  savings: 850.00,
  monthlyStipend: 100,
  totalIncome: 1950,
  totalExpenses: 702.50,
};

export const mockBudget = {
  essentials: { allocated: 400, spent: 324.50, color: "category-essentials" },
  athletic: { allocated: 150, spent: 89.75, color: "category-athletic" },
  education: { allocated: 100, spent: 67.25, color: "category-education" },
  savings: { allocated: 200, spent: 0, color: "category-savings" },
  fun: { allocated: 100, spent: 78.50, color: "category-fun" },
  refund: { allocated: 0, spent: 0, color: "category-refund" },
};

export const mockTransactions = [
  { id: 1, date: "2024-01-15", amount: 24.99, category: "essentials", description: "Grocery Store", type: "expense" },
  { id: 2, date: "2024-01-14", amount: 12.50, category: "fun", description: "Coffee with friends", type: "expense" },
  { id: 3, date: "2024-01-13", amount: 100.00, category: "income", description: "Monthly Stipend", type: "income" },
  { id: 4, date: "2024-01-12", amount: 45.00, category: "athletic", description: "Protein powder", type: "expense" },
  { id: 5, date: "2024-01-11", amount: 18.75, category: "education", description: "Course materials", type: "expense" },
  { id: 6, date: "2024-01-10", amount: 650.00, category: "refund", description: "Scholarship refund", type: "income" },
];

export const mockRefunds = [
  { id: 1, date: "2024-01-10", amount: 650.00, source: "Merit Scholarship", allocated: true },
  { id: 2, date: "2023-12-05", amount: 400.00, source: "Pell Grant", allocated: true },
  { id: 3, date: "2023-11-15", amount: 800.00, source: "Athletic Scholarship", allocated: true },
];

export const mockGoals = [
  { id: 1, name: "Emergency Fund", target: 500, current: 285, category: "savings" },
  { id: 2, name: "New Cleats", target: 120, current: 67, category: "athletic" },
  { id: 3, name: "Spring Break", target: 300, current: 150, category: "fun" },
];

export const mockUpcomingTransactions = [
  { id: 1, date: "2024-01-20", amount: 29.99, description: "Spotify Premium", type: "subscription" },
  { id: 2, date: "2024-01-25", amount: 15.00, description: "Gym membership", type: "subscription" },
  { id: 3, date: "2024-02-01", amount: 100.00, description: "Monthly Stipend", type: "income" },
];

export const categoryLabels: Record<string, string> = {
  essentials: "Essentials",
  savings: "Savings", 
  personal: "Personal",
  extra: "Extra",
  athletic: "Athletic/Health", 
  education: "Education",
  fun: "Wants/Fun",
  refund: "Refund Holding",
  transportation: "Transportation",
  entertainment: "Entertainment",
  food: "Food & Dining",
  health: "Health & Wellness",
  shopping: "Shopping",
  bills: "Bills & Utilities",
  stipend: "Stipend",
  scholarship: "Scholarship",
  "side-gig": "Side Gig",
  gift: "Gift/Family",
  other: "Other",
};

export const categoryIcons: Record<string, string> = {
  essentials: "🏠",
  savings: "💰",
  personal: "👤",
  extra: "✨",
  athletic: "💪",
  education: "📚",
  fun: "🎉",
  refund: "💳",
  transportation: "🚗",
  entertainment: "🎬",
  food: "🍔",
  health: "🏥",
  shopping: "🛍️",
  bills: "📄",
  stipend: "💵",
  scholarship: "🎓",
  "side-gig": "💼",
  gift: "🎁",
  other: "📦",
};