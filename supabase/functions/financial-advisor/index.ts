import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const systemPrompt = `You are a friendly and knowledgeable personal financial advisor AI for FinTrack, a personal finance tracking app. Your role is to:

1. **Analyze Spending Patterns**: Look at the user's transaction history to identify trends, top expense categories, and areas where they might be overspending.

2. **Provide Savings Advice**: Based on their income and expenses, suggest realistic savings amounts and strategies.

3. **Help Create Goals**: When asked, suggest specific savings goals with realistic target amounts and timelines based on their financial situation.

4. **Give Actionable Tips**: Provide practical, personalized advice to help users reach their financial goals faster.

Important guidelines:
- Be encouraging and supportive, not judgmental about spending habits
- Keep responses concise and focused (2-3 short paragraphs max)
- Use specific numbers from their data when relevant
- If suggesting a goal, include: goal name, target amount, and suggested timeline
- Format currency as USD
- If you don't have enough data to make a recommendation, say so and ask for more context

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
      const { transactions, budgets, goals, stats, refunds, customCategories } = financialContext;
      
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
- Total Budget Allocated: $${stats.totalBudget?.toFixed(2) || '0.00'}
- Total Budget Spent: $${stats.totalSpent?.toFixed(2) || '0.00'} (${stats.totalBudget > 0 ? ((stats.totalSpent / stats.totalBudget) * 100).toFixed(0) : 0}% utilization)\n`;
      }
      
      // Full transaction details
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
            contextMessage += `  - ${t.date}: "${t.description}" - $${t.amount.toFixed(2)}${t.receipt_url ? ' [has receipt]' : ''}\n`;
          });
          if (data.transactions.length > 5) {
            contextMessage += `  ... and ${data.transactions.length - 5} more transactions\n`;
          }
        });
        
        // Income breakdown
        contextMessage += `\n## INCOME SOURCES\n`;
        const incomeByCategory: Record<string, number> = {};
        incomes.forEach((t: any) => {
          incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
        });
        Object.entries(incomeByCategory).sort(([,a], [,b]) => b - a).forEach(([cat, amount]) => {
          contextMessage += `- ${cat}: $${amount.toFixed(2)}\n`;
        });
        
        // Recent transaction list
        contextMessage += `\n## RECENT TRANSACTIONS (Last 20)\n`;
        transactions.slice(0, 20).forEach((t: any) => {
          const sign = t.type === 'expense' ? '-' : '+';
          contextMessage += `- ${t.date} | ${t.type.toUpperCase()} | ${t.category} | "${t.description}" | ${sign}$${t.amount.toFixed(2)}\n`;
        });
        
        contextMessage += `\nTotal: ${transactions.length} transactions (${incomes.length} incomes, ${expenses.length} expenses)\n`;
      }
      
      // Full budget details
      if (budgets && budgets.length > 0) {
        contextMessage += `\n## BUDGET STATUS (All Categories)\n`;
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
      
      // Full goals details
      if (goals && goals.length > 0) {
        contextMessage += `\n## SAVINGS GOALS\n`;
        goals.forEach((g: any) => {
          const progress = g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100).toFixed(1) : 0;
          const remaining = g.target_amount - g.current_amount;
          contextMessage += `- ${g.name}: $${g.current_amount?.toFixed(2)}/$${g.target_amount?.toFixed(2)} (${progress}%)`;
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
          contextMessage += `- ${r.date} | ${r.source}: $${r.amount.toFixed(2)} (${r.status})\n`;
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
