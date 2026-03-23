const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'
const AUDIO_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'

export async function groqChat(
  messages: { role: string; content: string }[],
  model: string = 'llama-3.3-70b-versatile',
  maxTokens: number = 1000
) {
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens })
  })

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after') || '5'
    await new Promise(r => setTimeout(r, parseInt(retryAfter) * 1000))
    return groqChat(messages, model, maxTokens)
  }

  if (!response.ok) {
    throw new Error('AI service temporarily unavailable. Please try again.')
  }

  const data = await response.json()
  return data.choices[0].message.content as string
}

export async function groqTranscribe(audioBlob: Blob, filename: string = 'audio.webm') {
  const formData = new FormData()
  formData.append('file', audioBlob, filename)
  formData.append('model', 'whisper-large-v3-turbo')

  const response = await fetch(AUDIO_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: formData
  })

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after') || '5'
    await new Promise(r => setTimeout(r, parseInt(retryAfter) * 1000))
    return groqTranscribe(audioBlob, filename)
  }

  if (!response.ok) {
    throw new Error('Transcription service temporarily unavailable.')
  }

  const data = await response.json()
  return data.text as string
}
