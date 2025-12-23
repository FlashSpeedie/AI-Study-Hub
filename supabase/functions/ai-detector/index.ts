import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

// Allowed origins for CORS
const allowedOrigins = [
  'https://hchfnnicseujpbkrxpxm.lovableproject.com',
  'http://localhost:5173',
  'http://localhost:8080',
];

const getCorsHeaders = (origin: string) => {
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
};

// Input validation limits
const MAX_TEXT_LENGTH = 10000;
const MIN_TEXT_LENGTH = 50;

interface DetectorResult {
  name: string;
  score: number;
  verdict: 'human' | 'ai' | 'mixed';
  confidence: number;
}

serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { text } = await req.json();
    
    // Validate text input
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Text is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedText = text.trim();
    
    if (trimmedText.length < MIN_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: `Text must be at least ${MIN_TEXT_LENGTH} characters for accurate analysis` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize and limit text length
    const sanitizedText = trimmedText.substring(0, MAX_TEXT_LENGTH);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('AI Detector request processed');

    // Use AI to simulate multiple detector analyses
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
            content: `You are an AI content detection system. Analyze text to determine if it was written by AI or humans.

You must respond with ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "overallScore": <number 0-100 representing AI probability>,
  "verdict": "<Human Written|AI Generated|Mixed Content>",
  "detectors": [
    {
      "name": "GPTZero Algorithm",
      "score": <number 0-100>,
      "verdict": "<human|ai|mixed>",
      "confidence": <number 70-99>
    },
    {
      "name": "Originality Detector",
      "score": <number 0-100>,
      "verdict": "<human|ai|mixed>",
      "confidence": <number 70-99>
    },
    {
      "name": "Copyleaks Engine",
      "score": <number 0-100>,
      "verdict": "<human|ai|mixed>",
      "confidence": <number 70-99>
    },
    {
      "name": "ZeroGPT Scanner",
      "score": <number 0-100>,
      "verdict": "<human|ai|mixed>",
      "confidence": <number 70-99>
    },
    {
      "name": "Sapling AI Detector",
      "score": <number 0-100>,
      "verdict": "<human|ai|mixed>",
      "confidence": <number 70-99>
    }
  ],
  "highlights": [
    "<observation about the text>",
    "<another observation>",
    "<pattern noticed>"
  ]
}

Analysis criteria:
- Perplexity: Low perplexity suggests AI (AI text is more predictable)
- Burstiness: Humans write with more variation in sentence length
- Vocabulary diversity: AI tends to use more common words
- Repetitive patterns: AI often repeats phrases or structures
- Perfect grammar: Excessive perfection may indicate AI
- Transitions: AI uses more formulaic transitions
- Personal anecdotes: Lack of personal stories suggests AI
- Emotional depth: AI often lacks genuine emotional nuance

Each detector should have slightly different scores (within 10-15% of each other) to simulate real-world variation.
The overallScore should be the weighted average of all detector scores.`
          },
          { 
            role: 'user', 
            content: `Analyze this text for AI detection:\n\n${sanitizedText}` 
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('AI gateway error:', response.status);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait and try again.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: 'Failed to analyze text' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the JSON response
    let result;
    try {
      // Clean the response - remove any markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response');
      // Return a fallback result
      result = {
        overallScore: 50,
        verdict: "Unable to Determine",
        detectors: [
          { name: "Analysis Engine", score: 50, verdict: "mixed", confidence: 60 }
        ],
        highlights: ["Analysis inconclusive. Please try with different text."]
      };
    }

    console.log('AI Detector analysis completed');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI Detector error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 500,
      headers: { ...getCorsHeaders(req.headers.get('origin') || ''), 'Content-Type': 'application/json' },
    });
  }
});
