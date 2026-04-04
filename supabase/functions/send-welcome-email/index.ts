// @ts-nocheck - Deno-specific code
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const emailHtml = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; 
  margin: 0 auto; padding: 20px; color: #1a1a2e;">
  
  <div style="text-align: center; margin-bottom: 30px;">
    <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6366f1, #9333ea);
      border-radius: 16px; display: inline-flex; align-items: center; 
      justify-content: center; margin-bottom: 12px;">
      <span style="color: white; font-size: 28px; font-weight: 900;">A</span>
    </div>
    <h1 style="margin: 0; font-size: 28px; font-weight: 900; 
      background: linear-gradient(135deg, #6366f1, #9333ea);
      -webkit-background-clip: text; color: #6366f1;">APEX</h1>
    <p style="margin: 4px 0 0; font-size: 11px; letter-spacing: 3px; 
      text-transform: uppercase; color: #888;">AI Study Hub</p>
  </div>

  <h2 style="font-size: 22px; margin-bottom: 8px;">
    Welcome to APEX, {username}! 👋
  </h2>
  
  <p style="color: #555; line-height: 1.6;">
    You now have access to 10+ free AI-powered study tools 
    built specifically for students like you.
  </p>

  <div style="background: #f8f8ff; border-radius: 12px; 
    padding: 20px; margin: 24px 0;">
    <p style="margin: 0 0 12px; font-weight: 700; font-size: 14px;">
      Here's what you can do:
    </p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; font-size: 14px;">📊</td>
        <td style="padding: 6px 0; font-size: 14px;">
          <strong>Grade Tracking</strong> — Track every assignment and see your GPA live
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 14px;">🤖</td>
        <td style="padding: 6px 0; font-size: 14px;">
          <strong>AI Notes</strong> — Let AI summarize and organize your notes
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 14px;">🃏</td>
        <td style="padding: 6px 0; font-size: 14px;">
          <strong>Flashcard Generator</strong> — Generate flashcards from any topic
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 14px;">📝</td>
        <td style="padding: 6px 0; font-size: 14px;">
          <strong>Quiz Generator</strong> — Test yourself with AI-generated quizzes
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 14px;">⏱️</td>
        <td style="padding: 6px 0; font-size: 14px;">
          <strong>Pomodoro Timer</strong> — Stay focused with timed study sessions
        </td>
      </tr>
      <tr>
        <td style="padding: 6px 0; font-size: 14px;">🏆</td>
        <td style="padding: 6px 0; font-size: 14px;">
          <strong>Refer friends</strong> — Win ChatGPT Plus this month!
        </td>
      </tr>
    </table>
  </div>

  <div style="text-align: center; margin: 28px 0;">
    <a href="https://apexaistudy.vercel.app/dashboard"
      style="background: linear-gradient(135deg, #6366f1, #9333ea);
      color: white; padding: 14px 32px; border-radius: 10px;
      text-decoration: none; font-weight: 700; font-size: 15px;
      display: inline-block;">
      Start Studying Now →
    </a>
  </div>

  <div style="background: linear-gradient(135deg, #6366f1, #3b82f6);
    border-radius: 12px; padding: 20px; color: white; margin: 24px 0;">
    <p style="margin: 0 0 6px; font-weight: 700;">🏆 Win ChatGPT Plus this month!</p>
    <p style="margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.5;">
      Refer the most friends to APEX by end of month and win a free 
      ChatGPT Plus subscription. Find your referral link in 
      Account → Referrals.
    </p>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
  
  <p style="font-size: 12px; color: #aaa; text-align: center; margin: 0;">
    APEX AI Study Hub · Built for students<br/>
    <a href="https://apexaistudy.vercel.app" 
      style="color: #6366f1;">apexaistudy.vercel.app</a>
  </p>
</body>
</html>`

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, username } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const displayName = username || 'Student'
    const html = emailHtml.replace('{username}', displayName)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'APEX AI Study Hub <onboarding@resend.dev>',
        to: [email],
        subject: 'Welcome to APEX AI Study Hub 🎓',
        html: html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome email sent', id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})