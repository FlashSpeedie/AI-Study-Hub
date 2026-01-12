import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    const API_KEY = Deno.env.get('API_KEY');

    if (!API_KEY) {
      throw new Error('API_KEY is not configured');
    }

    console.log('Generating task suggestions for prompt:', prompt);

    // Get current date and time for due date calculations
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a helpful task planning assistant for students. Generate actionable, specific task suggestions based on the user's goals. 
            
Today's date is ${today} and the current time is ${currentHour}:00.

When suggesting due dates and times:
- High priority tasks should be due within 1-3 days with specific times
- Medium priority tasks should be due within 3-7 days  
- Low priority tasks can be due within 1-2 weeks
- Consider the context and deadlines mentioned by the user
- Return dates in YYYY-MM-DD format
- Return times in HH:MM format (24-hour)
- Suggest realistic study times (typically between 08:00 and 22:00)
- Estimate task duration based on complexity (15, 30, 45, 60, 90, or 120 minutes)

Categories should be one of: Study, Review, Practice, Research, Writing, Organization, Exam Prep, Project, Reading, or Other.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_tasks',
              description: 'Return 3-5 actionable task suggestions for the student with appropriate due dates, times, and duration estimates.',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'A clear, actionable task title' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task priority based on urgency' },
                        category: { type: 'string', description: 'Category like Study, Review, Practice, Research, Writing, Organization, Exam Prep, Project, Reading, or Other' },
                        suggested_due_date: { type: 'string', description: 'Suggested due date in YYYY-MM-DD format based on priority and complexity' },
                        suggested_time: { type: 'string', description: 'Suggested time to work on this task in HH:MM format (24-hour), e.g., 14:00' },
                        estimated_duration: { type: 'number', description: 'Estimated time needed in minutes (15, 30, 45, 60, 90, or 120)' }
                      },
                      required: ['title', 'priority', 'category', 'suggested_due_date', 'suggested_time', 'estimated_duration'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['suggestions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_tasks' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify({ suggestions: parsed.suggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ suggestions: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-task-suggest:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});