import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
        const { transcript, conversationHistory } = await req.json();

        if (!transcript) {
            throw new Error('No transcript provided');
        }

        const API_KEY = Deno.env.get('API_KEY');
        if (!API_KEY) {
            throw new Error('API_KEY not configured');
        }

        // Build conversation context
        let contextText = '';
        if (conversationHistory && conversationHistory.length > 0) {
            contextText = `\n\nPrevious conversation:\n${conversationHistory.join('\n')}`;
        }

        // Use Lovable AI to detect questions and provide answers
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
                        content: `You are a classroom assistant helping students during lectures. Your job is to:
1. Listen to what the teacher said
2. If it's a question, provide a SHORT, DIRECT answer (1-2 sentences max)
3. If it's not a question (just statement/explanation), respond with "NQA"
4. Always be concise - students need quick answers during class

Response format:
- For questions: Just give the answer, no explanations
- For non-questions: Respond with exactly "NQA" (Not a Question)`
                    },
                    {
                        role: 'user',
                        content: `Teacher said: "${transcript}"${contextText}

Is this a question? If yes, provide a short direct answer. If no, respond with "NQA".`
                    }
                ],
                max_tokens: 150,
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Question detection API error:', errorText);
            throw new Error('Failed to analyze lecture');
        }

        const data = await response.json();
        const result = data?.choices?.[0]?.message?.content?.trim() || '';

        // Check if it's a question or not
        const isQuestion = result !== 'NQA';

        return new Response(
            JSON.stringify({
                result,
                isQuestion,
                success: true
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to process lecture';
        console.error('Error in classroom-helper function:', error);
        return new Response(
            JSON.stringify({
                error: errorMessage,
                success: false
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
