import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const forecastSystemPrompt = `You are an advanced financial forecasting AI for SageTrack. Analyze the user's financial data and provide predictions.

Your analysis MUST be returned in the following JSON format only (no additional text before or after):

{
  "cashFlowPredictions": {
    "shortTerm": {
      "period": "1-3 months",
      "predictedIncome": number,
      "predictedExpenses": number,
      "predictedSavings": number,
      "confidence": "high" | "medium" | "low",
      "monthlyBreakdown": [
        { "month": "Month Name", "income": number, "expenses": number, "net": number }
      ],
      "insights": ["insight1", "insight2"]
    },
    "midTerm": {
      "period": "3-6 months",
      "predictedIncome": number,
      "predictedExpenses": number,
      "predictedSavings": number,
      "confidence": "high" | "medium" | "low",
      "monthlyBreakdown": [
        { "month": "Month Name", "income": number, "expenses": number, "net": number }
      ],
      "insights": ["insight1", "insight2"]
    },
    "longTerm": {
      "period": "6-12 months",
      "predictedIncome": number,
      "predictedExpenses": number,
      "predictedSavings": number,
      "confidence": "high" | "medium" | "low",
      "monthlyBreakdown": [
        { "month": "Month Name", "income": number, "expenses": number, "net": number }
      ],
      "insights": ["insight1", "insight2"]
    }
  },
  "goalProjections": [
    {
      "goalId": "id",
      "goalName": "name",
      "currentAmount": number,
      "targetAmount": number,
      "projectedCompletionDate": "YYYY-MM-DD or null",
      "onTrack": boolean,
      "monthlyContributionNeeded": number,
      "recommendedAction": "string"
    }
  ],
  "subscriptions": [
    {
      "name": "detected subscription name",
      "amount": number,
      "frequency": "monthly" | "weekly" | "yearly",
      "category": "category name",
      "confidence": "high" | "medium" | "low",
      "annualCost": number,
      "transactionIds": ["id1", "id2"]
    }
  ],
  "totalMonthlySubscriptions": number,
  "totalAnnualSubscriptions": number,
  "riskFactors": [
    {
      "type": "overspending" | "income_volatility" | "low_savings" | "budget_breach" | "goal_risk",
      "severity": "high" | "medium" | "low",
      "description": "string",
      "recommendation": "string"
    }
  ],
  "opportunities": [
    {
      "type": "savings_potential" | "subscription_optimization" | "budget_reallocation" | "goal_acceleration",
      "title": "string",
      "potentialSavings": number,
      "description": "string",
      "actionItems": ["action1", "action2"]
    }
  ]
}

Guidelines:
- Base all predictions on actual transaction patterns from the data provided
- Identify recurring transactions as potential subscriptions (same/similar amounts at regular intervals)
- Calculate goal completion dates based on current savings rate
- Provide confidence levels based on data consistency
- All monetary values should be numbers (not strings)
- Be conservative with predictions when data is limited
- Look for patterns in spending by category and time
- Consider seasonality if visible in the data`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { financialContext, analysisType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build detailed context for forecasting
    let contextMessage = "";
    if (financialContext) {
      const { transactions, budgets, budgetsList, goals, stats, refunds } = financialContext;
      
      contextMessage = `\n\n=== FINANCIAL DATA FOR FORECASTING ===\n`;
      
      // Include date context
      contextMessage += `\nAnalysis Date: ${new Date().toISOString().split('T')[0]}\n`;
      
      // Stats summary
      if (stats) {
        contextMessage += `\n## CURRENT FINANCIAL STATE
- Monthly Income: $${stats.monthlyIncome?.toFixed(2) || '0.00'}
- Monthly Expenses: $${stats.monthlyExpenses?.toFixed(2) || '0.00'}
- Available Balance: $${stats.balance?.toFixed(2) || '0.00'}
- Total Savings in Goals: $${stats.savings?.toFixed(2) || '0.00'}
- Income Change vs Last Period: ${stats.incomeChange?.value?.toFixed(1) || '0'}%
- Expense Change vs Last Period: ${stats.expenseChange?.value?.toFixed(1) || '0'}%\n`;
      }
      
      // Full transaction history for pattern detection
      if (transactions && transactions.length > 0) {
        // Group by month for trend analysis
        const monthlyTotals: Record<string, { income: number; expenses: number; transactions: any[] }> = {};
        
        transactions.forEach((t: any) => {
          const month = t.date?.substring(0, 7); // YYYY-MM
          if (!monthlyTotals[month]) {
            monthlyTotals[month] = { income: 0, expenses: 0, transactions: [] };
          }
          if (t.type === 'income') {
            monthlyTotals[month].income += t.amount;
          } else {
            monthlyTotals[month].expenses += t.amount;
          }
          monthlyTotals[month].transactions.push(t);
        });
        
        contextMessage += `\n## MONTHLY TRENDS (for pattern analysis)\n`;
        Object.entries(monthlyTotals)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 12)
          .forEach(([month, data]) => {
            const net = data.income - data.expenses;
            contextMessage += `${month}: Income $${data.income.toFixed(2)}, Expenses $${data.expenses.toFixed(2)}, Net ${net >= 0 ? '+' : ''}$${net.toFixed(2)} (${data.transactions.length} transactions)\n`;
          });
        
        // Detailed transactions for subscription detection
        contextMessage += `\n## ALL TRANSACTIONS (for subscription detection)\n`;
        transactions.forEach((t: any) => {
          contextMessage += `[ID: ${t.id}] ${t.date} | ${t.type} | ${t.category} | "${t.description}" | $${t.amount.toFixed(2)}\n`;
        });
        
        // Category spending patterns
        const categoryTotals: Record<string, { total: number; count: number; avgAmount: number }> = {};
        transactions
          .filter((t: any) => t.type === 'expense')
          .forEach((t: any) => {
            if (!categoryTotals[t.category]) {
              categoryTotals[t.category] = { total: 0, count: 0, avgAmount: 0 };
            }
            categoryTotals[t.category].total += t.amount;
            categoryTotals[t.category].count++;
          });
        
        Object.keys(categoryTotals).forEach(cat => {
          categoryTotals[cat].avgAmount = categoryTotals[cat].total / categoryTotals[cat].count;
        });
        
        contextMessage += `\n## SPENDING BY CATEGORY (averages for prediction)\n`;
        Object.entries(categoryTotals)
          .sort(([,a], [,b]) => b.total - a.total)
          .forEach(([cat, data]) => {
            contextMessage += `${cat}: Total $${data.total.toFixed(2)}, ${data.count} transactions, Avg $${data.avgAmount.toFixed(2)}\n`;
          });
      }
      
      // Goals with progress
      if (goals && goals.length > 0) {
        contextMessage += `\n## SAVINGS GOALS (for projection)\n`;
        goals.forEach((g: any) => {
          const remaining = g.target_amount - g.current_amount;
          const progress = g.target_amount > 0 ? (g.current_amount / g.target_amount * 100) : 0;
          contextMessage += `[ID: ${g.id}] "${g.name}": $${g.current_amount.toFixed(2)}/$${g.target_amount.toFixed(2)} (${progress.toFixed(1)}%)`;
          contextMessage += ` | Remaining: $${remaining.toFixed(2)}`;
          if (g.target_date) contextMessage += ` | Target: ${g.target_date}`;
          contextMessage += ` | Status: ${g.status}\n`;
        });
      }
      
      // Budgets
      if (budgetsList && budgetsList.length > 0) {
        contextMessage += `\n## BUDGET ALLOCATIONS\n`;
        budgetsList.forEach((b: any) => {
          contextMessage += `"${b.name}": Expense Alloc $${b.expense_allocation.toFixed(2)}, Savings Alloc $${b.savings_allocation.toFixed(2)}, Spent $${b.expense_spent.toFixed(2)}`;
          if (b.linked_goal_name) contextMessage += ` → Goal: "${b.linked_goal_name}"`;
          contextMessage += `\n`;
        });
      }
      
      contextMessage += `\n=== END FINANCIAL DATA ===\n`;
    }

    const userMessage = analysisType === 'what-if' 
      ? "Analyze the data and provide forecasts with special attention to potential scenarios and opportunities for improvement."
      : "Analyze the financial data and provide comprehensive forecasts for short-term (1-3 months), mid-term (3-6 months), and long-term (6-12 months) periods. Include subscription detection and goal projections.";

    console.log("Sending forecast request to Lovable AI Gateway");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: forecastSystemPrompt + contextMessage },
          { role: "user", content: userMessage },
        ],
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

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (handle potential markdown code blocks)
    let forecast;
    try {
      let jsonStr = content;
      // Remove markdown code blocks if present
      if (content.includes('```json')) {
        jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.includes('```')) {
        jsonStr = content.replace(/```\n?/g, '');
      }
      forecast = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse forecast JSON:", parseError, "Content:", content);
      return new Response(JSON.stringify({ 
        error: "Failed to parse forecast data",
        rawContent: content 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(forecast), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Financial forecast error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
