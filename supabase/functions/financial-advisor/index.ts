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

    // Build context message with financial data
    let contextMessage = "";
    if (financialContext) {
      const { transactions, budgets, goals, stats } = financialContext;
      
      contextMessage = `\n\nHere is the user's current financial data:\n`;
      
      if (stats) {
        contextMessage += `\n**Financial Summary:**
- Monthly Income: $${stats.monthlyIncome?.toFixed(2) || '0.00'}
- Monthly Expenses: $${stats.monthlyExpenses?.toFixed(2) || '0.00'}
- Available Balance: $${stats.balance?.toFixed(2) || '0.00'}\n`;
      }
      
      if (transactions && transactions.length > 0) {
        const expenses = transactions.filter((t: any) => t.type === 'expense');
        const incomes = transactions.filter((t: any) => t.type === 'income');
        
        // Categorize expenses
        const categoryTotals: Record<string, number> = {};
        expenses.forEach((t: any) => {
          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });
        
        const sortedCategories = Object.entries(categoryTotals)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
        
        contextMessage += `\n**Top Expense Categories (Recent):**\n`;
        sortedCategories.forEach(([cat, amount]) => {
          contextMessage += `- ${cat}: $${amount.toFixed(2)}\n`;
        });
        
        contextMessage += `\n**Recent Transactions:** ${transactions.length} total (${incomes.length} incomes, ${expenses.length} expenses)\n`;
      }
      
      if (budgets && budgets.length > 0) {
        contextMessage += `\n**Budget Status:**\n`;
        budgets.slice(0, 5).forEach((b: any) => {
          const percentUsed = b.allocated > 0 ? ((b.spent / b.allocated) * 100).toFixed(0) : 0;
          contextMessage += `- ${b.category}: $${b.spent?.toFixed(2)}/$${b.allocated?.toFixed(2)} (${percentUsed}% used)\n`;
        });
      }
      
      if (goals && goals.length > 0) {
        contextMessage += `\n**Current Savings Goals:**\n`;
        goals.forEach((g: any) => {
          const progress = g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100).toFixed(0) : 0;
          contextMessage += `- ${g.name}: $${g.current_amount?.toFixed(2)}/$${g.target_amount?.toFixed(2)} (${progress}% complete)`;
          if (g.target_date) {
            contextMessage += ` - Target: ${g.target_date}`;
          }
          contextMessage += `\n`;
        });
      }
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
