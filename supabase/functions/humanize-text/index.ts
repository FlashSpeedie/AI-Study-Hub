import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, currentScore, iteration = 0 } = await req.json();
    const API_KEY = Deno.env.get('API_KEY');

    if (!API_KEY) {
      throw new Error('API_KEY is not configured');
    }

    if (!text || typeof text !== 'string' || text.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: 'Please provide at least 50 characters of text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Humanizing text, iteration ${iteration}, current score: ${currentScore}%`);

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
            content: `You are an expert at rewriting text to sound more naturally human while maintaining:
1. The exact same meaning and information
2. Proper grammar, spelling, and punctuation
3. A natural, conversational flow
4. Appropriate vocabulary for the context

Guidelines for humanizing text:
- Vary sentence structure and length naturally
- Use contractions where appropriate (don't, it's, we're)
- Add natural transitional phrases
- Include occasional informal expressions if contextually appropriate
- Break up overly complex sentences
- Use active voice more often
- Add personal touches without changing facts
- Avoid repetitive patterns

Your goal is to make the text indistinguishable from human-written content while preserving its meaning perfectly.

IMPORTANT: Only output the rewritten text. Do not add any explanations, comments, or meta-text.`
          },
          {
            role: 'user',
            content: `Please rewrite the following text to sound more naturally human. Maintain all the original meaning, facts, and information while making it read like it was written by a human:\n\n${text}`
          }
        ],
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
    const humanizedText = data.choices?.[0]?.message?.content?.trim();

    if (!humanizedText) {
      throw new Error('No response from AI');
    }

    return new Response(
      JSON.stringify({ 
        humanizedText,
        iteration: iteration + 1 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in humanize-text:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
