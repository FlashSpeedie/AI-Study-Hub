import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation limits
const MAX_TOPIC_LENGTH = 500;
const MAX_FILE_CONTENT_LENGTH = 50000;
const MAX_QUESTION_COUNT = 20;
const MIN_QUESTION_COUNT = 1;

serve(async (req) => {
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Quiz generation request from user:', user.id, { topic: sanitizedTopic.substring(0, 50), questionCount: validQuestionCount, hasFile: !!sanitizedFileContent });

    const contentToAnalyze = sanitizedFileContent 
      ? `Based on this content:\n\n${sanitizedFileContent}\n\nGenerate questions about this material.`
      : `Generate questions about the topic: ${sanitizedTopic}`;

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
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
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
      
      throw new Error('AI service unavailable');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI Response received for user:', user.id);

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
      console.error('Failed to parse quiz JSON:', e);
      throw new Error('Failed to generate valid quiz questions');
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Quiz generation error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
