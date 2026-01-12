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
const MAX_TOPIC_LENGTH = 500;
const MAX_FILE_CONTENT_LENGTH = 50000;
const MAX_QUESTION_COUNT = 20;
const MIN_QUESTION_COUNT = 1;

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

    const { topic, questionCount, fileContent } = await req.json();
    
    // Validate and sanitize inputs
    const sanitizedTopic = typeof topic === 'string' ? topic.substring(0, MAX_TOPIC_LENGTH).trim() : '';
    const sanitizedFileContent = typeof fileContent === 'string' ? fileContent.substring(0, MAX_FILE_CONTENT_LENGTH) : '';
    
    // Validate question count
    let validQuestionCount = parseInt(String(questionCount), 10);
    if (isNaN(validQuestionCount) || validQuestionCount < MIN_QUESTION_COUNT) {
      validQuestionCount = MIN_QUESTION_COUNT;
    } else if (validQuestionCount > MAX_QUESTION_COUNT) {
      validQuestionCount = MAX_QUESTION_COUNT;
    }

    // Ensure at least one input is provided
    if (!sanitizedTopic && !sanitizedFileContent) {
      return new Response(JSON.stringify({ error: 'Topic or file content is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const API_KEY = Deno.env.get('API_KEY');
    
    if (!API_KEY) {
      console.error('API_KEY is not configured');
      return new Response(JSON.stringify({ error: 'Service configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Quiz generation request processed');

    const contentToAnalyze = sanitizedFileContent 
      ? `Based on this content:\n\n${sanitizedFileContent}\n\nGenerate questions about this material.`
      : `Generate questions about the topic: ${sanitizedTopic}`;

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
            content: `You are an expert quiz generator for STEM education. Generate exactly ${validQuestionCount} quiz questions in valid JSON format.

Return ONLY a JSON array with this exact structure (no markdown, no explanation):
[
  {
    "type": "multiple-choice",
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A"
  },
  {
    "type": "true-false",
    "question": "Statement to evaluate?",
    "correctAnswer": "True"
  },
  {
    "type": "fill-blank",
    "question": "The _____ is important because...",
    "correctAnswer": "answer word"
  }
]

Mix question types. Make questions educational and appropriate for high school/college level.
Ensure correctAnswer for multiple-choice matches one of the options exactly.
For true-false, correctAnswer must be "True" or "False".`
          },
          { role: 'user', content: contentToAnalyze }
        ],
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
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
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
    
    console.log('Quiz generation completed');

    // Parse the JSON from the response
    let questions;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      questions = JSON.parse(cleanContent.trim());
    } catch (e) {
      console.error('Failed to parse quiz JSON');
      return new Response(JSON.stringify({ error: 'Failed to generate valid quiz questions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 500,
      headers: { ...getCorsHeaders(req.headers.get('origin') || ''), 'Content-Type': 'application/json' },
    });
  }
});
