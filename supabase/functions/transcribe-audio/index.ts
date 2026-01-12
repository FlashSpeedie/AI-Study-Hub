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

    // Use Lovable AI for transcription via Gemini which supports audio
    const ApiKey = Deno.env.get('API_KEY');
    if (!ApiKey) {
      throw new Error('API_KEY not configured');
    }

    // Convert audio to base64
    const audioBytes = await audioFile.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBytes)));

    // Use Gemini model that supports audio transcription
    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ApiKey}`,
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
                text: 'Please transcribe the following audio accurately. Only return the transcription text, nothing else. If you cannot process the audio or there is no speech, return an empty string.'
              },
              {
                type: 'audio',
                audio: {
                  data: base64Audio,
                  format: audioFile.type.split('/')[1] || 'webm'
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Transcription API error:', errorText);
      throw new Error('Failed to transcribe audio');
    }

    const data = await response.json();
    const transcript = data.choices?.[0]?.message?.content?.trim() || '';

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
