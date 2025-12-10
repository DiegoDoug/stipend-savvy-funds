import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are a friendly and knowledgeable personal financial advisor AI for SageTrack, a personal finance tracking app. Your role is to:

1. **Analyze Spending Patterns**: Look at the user's transaction history to identify trends, top expense categories, and areas where they might be overspending.

2. **Provide Savings Advice**: Based on their income and expenses, suggest realistic savings amounts and strategies.

3. **Help Create Goals**: When asked, suggest specific savings goals with realistic target amounts and timelines based on their financial situation.

4. **Manage Budgets**: Help users create, edit, and organize budgets. Each budget can have expense allocation (for spending) and savings allocation (auto-transfers to linked goals).

5. **Give Actionable Tips**: Provide practical, personalized advice to help users reach their financial goals faster.

6. **Create & Edit Financial Records**: You can help users create expenses, incomes, goals, and budgets, or edit existing ones. When doing so, use the exact formats below so users can confirm with one click.

Important guidelines:
- Be encouraging and supportive, not judgmental about spending habits
- Keep responses concise and focused (2-3 short paragraphs max)
- Use specific numbers from their data when relevant
- Format currency as USD
- If you don't have enough data to make a recommendation, say so and ask for more context
- When suggesting budgets, ensure the total allocations don't exceed monthly income

**CRITICAL: Action Formats - Use these EXACT formats so users can confirm actions with one click:**

Creating Records:
[CREATE_GOAL: Goal Name | $TargetAmount | Description | Target Date (YYYY-MM-DD)]
[CREATE_EXPENSE: Description | $Amount | Category | Date (YYYY-MM-DD)]
[CREATE_INCOME: Description | $Amount | Category | Date (YYYY-MM-DD)]
[CREATE_BUDGET: Budget Name | $ExpenseAllocation | $SavingsAllocation | LinkedGoalName or "none" | Description]

Editing Records (use the exact ID from the user's data):
[EDIT_GOAL: id | Goal Name | $CurrentAmount | $TargetAmount | Target Date (YYYY-MM-DD) | Description]
[EDIT_EXPENSE: id | Description | $Amount | Category | Date (YYYY-MM-DD)]
[EDIT_INCOME: id | Description | $Amount | Category | Date (YYYY-MM-DD)]
[EDIT_BUDGET: id | Budget Name | $ExpenseAllocation | $SavingsAllocation | LinkedGoalName or "none" | Description]

Deleting Records:
[DELETE_BUDGET: id | Budget Name]

Linking Goals to Budgets:
[LINK_GOAL_TO_BUDGET: BudgetName | GoalName]

Adding Funds to Goals:
[ADD_FUNDS_TO_GOAL: GoalName | $Amount]

Examples:
- [CREATE_GOAL: Emergency Fund | $5000 | 3-6 months of expenses for emergencies | 2025-12-31]
- [CREATE_BUDGET: Monthly Living | $1500 | $200 | Emergency Fund | Essential monthly expenses with savings]
- [CREATE_BUDGET: Personal | $300 | $0 | none | Fun and entertainment spending]
- [EDIT_BUDGET: abc123-uuid | Monthly Living | $1600 | $250 | Emergency Fund | Updated allocations]
- [DELETE_BUDGET: xyz789-uuid | Old Budget]
- [LINK_GOAL_TO_BUDGET: Monthly Living | Vacation Fund]
- [ADD_FUNDS_TO_GOAL: Emergency Fund | $100]

Budget System Explanation:
- Budgets are funded from the user's monthly income pool
- Each budget can have expense allocation (money for spending) and savings allocation (auto-transfers to linked goals)
- Total allocations across all budgets should not exceed monthly income
- Savings allocations auto-transfer to linked goals at month reset

When suggesting to edit an existing record, you MUST use the exact ID from the user's financial data provided below. Never make up IDs.

You can suggest multiple actions in one response. Each action MUST follow these formats exactly for the confirmation buttons to appear.

When the user provides financial data, analyze it carefully to give personalized advice.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, financialContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context message with FULL financial data
    let contextMessage = "";
    if (financialContext) {
      const { transactions, budgets, budgetsList, goals, stats, refunds, customCategories } = financialContext;
      
      contextMessage = `\n\n=== USER'S COMPLETE FINANCIAL DATA ===\n`;
      
      // Full stats with trends
      if (stats) {
        const incomeChangeText = stats.incomeChange?.text || `${stats.incomeChange?.value >= 0 ? '+' : ''}${stats.incomeChange?.value?.toFixed(1) || '0'}%`;
        const expenseChangeText = stats.expenseChange?.text || `${stats.expenseChange?.value >= 0 ? '+' : ''}${stats.expenseChange?.value?.toFixed(1) || '0'}%`;
        
        contextMessage += `\n## FINANCIAL SUMMARY
- Available Balance: $${stats.balance?.toFixed(2) || '0.00'}
- Estimated Savings: $${stats.savings?.toFixed(2) || '0.00'}
- Monthly Income: $${stats.monthlyIncome?.toFixed(2) || '0.00'} (${incomeChangeText} vs last period)
- Monthly Expenses: $${stats.monthlyExpenses?.toFixed(2) || '0.00'} (${expenseChangeText} vs last period)
- Total Budget Allocated: $${stats.totalBudgetAllocated?.toFixed(2) || '0.00'}
- Remaining to Allocate: $${stats.remainingToAllocate?.toFixed(2) || '0.00'}
- Total Budget Spent: $${stats.totalSpent?.toFixed(2) || '0.00'}\n`;
      }
      
      // New Budgets System (with expense/savings allocations)
      if (budgetsList && budgetsList.length > 0) {
        contextMessage += `\n## BUDGETS (New System)\n`;
        contextMessage += `Monthly Income Pool: $${stats?.monthlyIncome?.toFixed(2) || '0.00'}\n`;
        let totalAllocated = 0;
        budgetsList.forEach((b: any) => {
          const total = (b.expense_allocation || 0) + (b.savings_allocation || 0);
          totalAllocated += total;
          const expenseRemaining = (b.expense_allocation || 0) - (b.expense_spent || 0);
          contextMessage += `\n### [ID: ${b.id}] ${b.name}\n`;
          contextMessage += `  - Expense Allocation: $${(b.expense_allocation || 0).toFixed(2)} (Spent: $${(b.expense_spent || 0).toFixed(2)}, Remaining: $${expenseRemaining.toFixed(2)})\n`;
          contextMessage += `  - Savings Allocation: $${(b.savings_allocation || 0).toFixed(2)}/month`;
          if (b.linked_goal_name) {
            contextMessage += ` → Linked to "${b.linked_goal_name}"`;
          }
          contextMessage += `\n`;
          if (b.description) {
            contextMessage += `  - Description: "${b.description}"\n`;
          }
          contextMessage += `  - Total Allocation: $${total.toFixed(2)}\n`;
        });
        contextMessage += `\nTotal Allocated: $${totalAllocated.toFixed(2)} of $${stats?.monthlyIncome?.toFixed(2) || '0.00'}\n`;
      }
      
      // Full transaction details with IDs for editing
      if (transactions && transactions.length > 0) {
        const expenses = transactions.filter((t: any) => t.type === 'expense');
        const incomes = transactions.filter((t: any) => t.type === 'income');
        
        // Categorize expenses with details
        const categoryTotals: Record<string, { total: number; count: number; transactions: any[] }> = {};
        expenses.forEach((t: any) => {
          if (!categoryTotals[t.category]) {
            categoryTotals[t.category] = { total: 0, count: 0, transactions: [] };
          }
          categoryTotals[t.category].total += t.amount;
          categoryTotals[t.category].count++;
          categoryTotals[t.category].transactions.push(t);
        });
        
        const sortedCategories = Object.entries(categoryTotals)
          .sort(([,a], [,b]) => b.total - a.total);
        
        contextMessage += `\n## EXPENSE BREAKDOWN BY CATEGORY\n`;
        sortedCategories.forEach(([cat, data]) => {
          contextMessage += `\n### ${cat}: $${data.total.toFixed(2)} (${data.count} transactions)\n`;
          data.transactions.slice(0, 5).forEach((t: any) => {
            contextMessage += `  - [ID: ${t.id}] ${t.date}: "${t.description}" - $${t.amount.toFixed(2)}`;
            if (t.budget_name) contextMessage += ` [Budget: ${t.budget_name}]`;
            if (t.receipt_url) contextMessage += ` [has receipt]`;
            contextMessage += `\n`;
          });
          if (data.transactions.length > 5) {
            contextMessage += `  ... and ${data.transactions.length - 5} more transactions\n`;
          }
        });
        
        // Income breakdown with IDs
        contextMessage += `\n## INCOME SOURCES\n`;
        incomes.forEach((t: any) => {
          contextMessage += `- [ID: ${t.id}] ${t.date} | ${t.category}: "${t.description}" - $${t.amount.toFixed(2)}\n`;
        });
        
        // Recent transaction list with IDs
        contextMessage += `\n## RECENT TRANSACTIONS (Last 20)\n`;
        transactions.slice(0, 20).forEach((t: any) => {
          const sign = t.type === 'expense' ? '-' : '+';
          contextMessage += `- [ID: ${t.id}] ${t.date} | ${t.type.toUpperCase()} | ${t.category}`;
          if (t.budget_name) contextMessage += ` | Budget: ${t.budget_name}`;
          contextMessage += ` | "${t.description}" | ${sign}$${t.amount.toFixed(2)}\n`;
        });
        
        contextMessage += `\nTotal: ${transactions.length} transactions (${incomes.length} incomes, ${expenses.length} expenses)\n`;
      }
      
      // Legacy budget categories (for backwards compatibility)
      if (budgets && budgets.length > 0 && (!budgetsList || budgetsList.length === 0)) {
        contextMessage += `\n## BUDGET STATUS (Legacy Categories)\n`;
        budgets.forEach((b: any) => {
          const percentUsed = b.allocated > 0 ? ((b.spent / b.allocated) * 100).toFixed(0) : 0;
          const status = Number(percentUsed) >= 100 ? '⚠️ OVER BUDGET' : Number(percentUsed) >= 80 ? '⚡ NEAR LIMIT' : '✓ OK';
          contextMessage += `- ${b.category}: $${b.spent?.toFixed(2)}/$${b.allocated?.toFixed(2)} (${percentUsed}%) ${status}`;
          if (b.last_reset) {
            contextMessage += ` [reset: ${b.last_reset}]`;
          }
          contextMessage += `\n`;
        });
      }
      
      // Full goals details with IDs for editing
      if (goals && goals.length > 0) {
        contextMessage += `\n## SAVINGS GOALS\n`;
        goals.forEach((g: any) => {
          const progress = g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100).toFixed(1) : 0;
          const remaining = g.target_amount - g.current_amount;
          contextMessage += `- [ID: ${g.id}] ${g.name}: $${g.current_amount?.toFixed(2)}/$${g.target_amount?.toFixed(2)} (${progress}%)`;
          contextMessage += ` | Remaining: $${remaining.toFixed(2)}`;
          if (g.target_date) {
            contextMessage += ` | Target Date: ${g.target_date}`;
          }
          if (g.description) {
            contextMessage += ` | Note: "${g.description}"`;
          }
          contextMessage += ` | Status: ${g.status}\n`;
        });
      }
      
      // Refunds
      if (refunds && refunds.length > 0) {
        contextMessage += `\n## PENDING/RECEIVED REFUNDS\n`;
        refunds.forEach((r: any) => {
          contextMessage += `- [ID: ${r.id}] ${r.date} | ${r.source}: $${r.amount.toFixed(2)} (${r.status})\n`;
        });
      }
      
      // Custom categories
      if (customCategories && customCategories.length > 0) {
        contextMessage += `\n## USER'S CUSTOM CATEGORIES\n`;
        customCategories.forEach((c: any) => {
          contextMessage += `- ${c.label} (${c.type})\n`;
        });
      }
      
      contextMessage += `\n=== END FINANCIAL DATA ===\n`;
    }

    const fullSystemPrompt = systemPrompt + contextMessage;
    
    console.log("Sending request to Lovable AI Gateway with context");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: fullSystemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Failed to get AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Financial advisor error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
