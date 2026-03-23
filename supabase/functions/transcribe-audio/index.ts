// @ts-nocheck - Deno-specific code that uses URL imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const authHeader = req.headers.get('Authorization')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Maximum allowed file size (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024

// Allowed audio MIME types
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
]

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Validate Content-Type
  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return new Response(
      JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the audio file from the request
    const formData = await req.formData()
    const audioFile = formData.get('audio')
    
    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'No audio file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate it's a File object
    if (!(audioFile instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File too large. Maximum size is 25MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file type
    const fileType = audioFile.type || ''
    const isAudioType = ALLOWED_AUDIO_TYPES.some(type => 
      fileType.includes(type.replace('audio/', ''))
    )
    
    // Also check if file extension suggests audio (fallback)
    const fileName = audioFile.name.toLowerCase()
    const hasAudioExtension = fileName.endsWith('.mp3') || 
                              fileName.endsWith('.mp4') || 
                              fileName.endsWith('.wav') || 
                              fileName.endsWith('.webm') || 
                              fileName.endsWith('.ogg') || 
                              fileName.endsWith('.m4a') ||
                              fileName.endsWith('.aac')
    
    if (!isAudioType && !hasAudioExtension && fileType !== '') {
      return new Response(
        JSON.stringify({ error: 'Invalid file type. Please upload an audio file.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Forward to Groq Whisper
    const groqForm = new FormData()
    groqForm.append('file', audioFile)
    groqForm.append('model', 'whisper-large-v3-turbo')
    groqForm.append('response_format', 'json')

    const response = await fetch(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: groqForm,
      }
    )

    // Rate limit handling
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit reached. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!response.ok) {
      const error = await response.text()
      console.error('Groq Whisper error:', error)
      return new Response(
        JSON.stringify({ error: 'Transcription failed. Please try again.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    
    // Validate response structure
    if (!data.text) {
      console.error('Unexpected response format:', data)
      return new Response(
        JSON.stringify({ error: 'Invalid response from transcription service.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ transcript: data.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in transcribe-audio:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
