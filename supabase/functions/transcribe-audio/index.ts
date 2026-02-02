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
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      throw new Error('No audio file provided');
    }

    // Check file size (max 20MB for Lovable)
    const fileSizeMB = audioFile.size / (1024 * 1024);
    if (fileSizeMB > 20) {
      throw new Error('Audio file too large. Maximum size is 20MB.');
    }

    const API_KEY = Deno.env.get('API_KEY');
    if (!API_KEY) {
      throw new Error('API_KEY not configured');
    }

    // Convert audio to base64
    const audioBytes = await audioFile.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBytes)));
    const audioFormat = audioFile.type.split('/')[1] || 'webm';

    // Use Lovable AI with Gemini which supports audio input
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
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please transcribe this audio file accurately. Return ONLY the transcription text without any additional comments or formatting. If there is no speech or the audio is unclear, return an empty string.'
              },
              {
                type: 'audio',
                audio: {
                  data: base64Audio,
                  format: audioFormat
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Transcription API error:', errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      } else {
        throw new Error('Failed to transcribe audio. Please try again.');
      }
    }

    const data = await response.json();
    const transcript = data?.choices?.[0]?.message?.content?.trim() || '';

    return new Response(
      JSON.stringify({ transcript, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
    console.error('Error in transcribe-audio function:', error);
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
