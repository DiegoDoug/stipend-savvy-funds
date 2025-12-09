import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPENSE_CATEGORIES = [
  'groceries', 'restaurants', 'transport', 'utilities', 'entertainment', 
  'shopping', 'healthcare', 'subscriptions', 'housing', 'education', 'other'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData } = await req.json();
    
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing receipt image with AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a receipt analysis AI. Analyze receipt images and extract structured expense data.
Your task is to identify:
- Vendor/store name
- Total amount paid (the final total, not subtotals)
- Transaction date
- Individual line items with names and prices
- Suggest an appropriate expense category from: ${EXPENSE_CATEGORIES.join(', ')}
- Create a concise description for this expense

Be precise with amounts - look for the final total after tax/tips. For dates, use YYYY-MM-DD format.
If you cannot clearly identify a field, return null for it rather than guessing.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this receipt image and extract the expense information.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_receipt_data',
              description: 'Extract structured data from a receipt image',
              parameters: {
                type: 'object',
                properties: {
                  vendor: {
                    type: 'string',
                    description: 'Name of the store or vendor'
                  },
                  amount: {
                    type: 'number',
                    description: 'Total amount paid (final total after tax/tips)'
                  },
                  date: {
                    type: 'string',
                    description: 'Transaction date in YYYY-MM-DD format'
                  },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        price: { type: 'number' }
                      },
                      required: ['name', 'price']
                    },
                    description: 'Individual line items from the receipt'
                  },
                  suggestedCategory: {
                    type: 'string',
                    enum: EXPENSE_CATEGORIES,
                    description: 'Suggested expense category based on vendor and items'
                  },
                  suggestedDescription: {
                    type: 'string',
                    description: 'A concise description for this expense (e.g., "Weekly groceries at Walmart")'
                  },
                  currency: {
                    type: 'string',
                    description: 'Currency symbol or code detected (default: USD)'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence score from 0 to 1 for the extraction accuracy'
                  }
                },
                required: ['vendor', 'amount', 'suggestedCategory', 'suggestedDescription', 'confidence']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_receipt_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service payment required.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to analyze receipt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_receipt_data') {
      console.error('No valid tool call in response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Failed to extract receipt data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted receipt data:', JSON.stringify(extractedData));

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          vendor: extractedData.vendor || null,
          amount: extractedData.amount || null,
          date: extractedData.date || null,
          items: extractedData.items || [],
          suggestedCategory: extractedData.suggestedCategory || 'other',
          suggestedDescription: extractedData.suggestedDescription || '',
          currency: extractedData.currency || 'USD',
          confidence: extractedData.confidence || 0.5
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing receipt:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
