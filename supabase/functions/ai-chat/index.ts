// @ts-nocheck - Deno-specific code that uses URL imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { messages, conversationId, context, message } = body

    // Handle grade entry context - parse natural language grades
    if (context === 'gradeEntry') {
      const gradeEntrySystemPrompt = `You are a grade entry assistant. When a user describes their grades in natural language, parse them and extract the information.

Examples of input and expected output:

Input: "Add Math 101 for Fall 2025: Homework 1 got 85/100, Quiz 1 got 18/20, and Test 1 got 78/100"

Output: <GRADE_DATA>{"academicYear": "2025-2026", "semester": "Fall 2025", "subject": "Math 101", "assignments": [{"name": "Homework 1", "earnedPoints": 85, "totalPoints": 100, "category": "Homework"}, {"name": "Quiz 1", "earnedPoints": 18, "totalPoints": 20, "category": "Quiz"}, {"name": "Test 1", "earnedPoints": 78, "totalPoints": 100, "category": "Test"}]}</GRADE_DATA>

Input: "For Chemistry 201 Spring 2026: Labs are 30%, Tests are 40%, Homework is 30%. Lab 1: 95/100, Lab 2: 88/100, Test 1: 82/100"

Output: <GRADE_DATA>{"academicYear": "2025-2026", "semester": "Spring 2026", "subject": "Chemistry 201", "assignments": [{"name": "Lab 1", "earnedPoints": 95, "totalPoints": 100, "category": "Labs"}, {"name": "Lab 2", "earnedPoints": 88, "totalPoints": 100, "category": "Labs"}, {"name": "Test 1", "earnedPoints": 82, "totalPoints": 100, "category": "Tests"}]}</GRADE_DATA>

Rules:
1. Always wrap the JSON in <GRADE_DATA> tags
2. Extract: academic year (e.g., "2025-2026"), semester (e.g., "Fall 2025"), subject name, and all assignments with their earned/total points
3. If the user just says "hi" or asks a question unrelated to grades, respond normally without <GRADE_DATA> tags
4. If you cannot extract complete grade information, ask clarifying questions

Respond with the extracted grade data in the exact format shown above, or ask for clarification if needed.`

      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: gradeEntrySystemPrompt },
              { role: 'user', content: message || messages?.[messages.length - 1]?.content || '' }
            ],
            max_tokens: 1500,
            temperature: 0.3,
          }),
        }
      )

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || '5'
        await new Promise(r => setTimeout(r, parseInt(retryAfter) * 1000))
        return new Response(
          JSON.stringify({ error: 'Rate limit reached. Please try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!response.ok) {
        const error = await response.text()
        console.error('Groq API error:', error)
        return new Response(
          JSON.stringify({ error: 'AI service temporarily unavailable.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const data = await response.json()
      const content = data.choices[0].message.content

      return new Response(
        JSON.stringify({ response: content }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `You are APEX AI Scholar Assistant, an intelligent study
   companion for students. Help with homework, explain
   concepts clearly, solve problems step by step, and
   provide academic guidance. Be encouraging and thorough.`

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...(messages || [])
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      }
    )

    // Rate limit handling
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') || '5'
      await new Promise(r => setTimeout(r, parseInt(retryAfter) * 1000))
      return new Response(
        JSON.stringify({ error: 'Rate limit reached. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!response.ok) {
      const error = await response.text()
      console.error('Groq API error:', error)
      return new Response(
        JSON.stringify({ error: 'AI service temporarily unavailable.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    return new Response(
      JSON.stringify({ result: content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in ai-chat:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
