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
    A new way to win with APEX 🏆
  </h2>
  
  <p style="color: #555; line-height: 1.6;">
    Hey {username}! You've been using APEX to level up your studies — 
    now it's time to share the love (and maybe win ChatGPT Plus)!
  </p>

  <div style="background: linear-gradient(135deg, #6366f1, #3b82f6);
    border-radius: 12px; padding: 24px; color: white; margin: 24px 0;">
    <p style="margin: 0 0 8px; font-weight: 700; font-size: 18px;">
      🎯 Win ChatGPT Plus This Month!
    </p>
    <p style="margin: 0; font-size: 14px; opacity: 0.95; line-height: 1.5;">
      The student who refers the most friends to APEX by the end of 
      this month wins a free ChatGPT Plus subscription (worth $20/month)!
    </p>
  </div>

  <div style="background: #f8f8ff; border-radius: 12px; 
    padding: 20px; margin: 24px 0;">
    <p style="margin: 0 0 16px; font-weight: 700; font-size: 14px;">
      How it works:
    </p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-size: 14px; width: 30px;">1️⃣</td>
        <td style="padding: 8px 0; font-size: 14px;">
          Get your unique referral link from Account → Referrals
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 14px;">2️⃣</td>
        <td style="padding: 8px 0; font-size: 14px;">
          Share with friends, classmates, study partners
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 14px;">3️⃣</td>
        <td style="padding: 8px 0; font-size: 14px;">
          They sign up using your link
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 14px;">4️⃣</td>
        <td style="padding: 8px 0; font-size: 14px;">
          They use any APEX tool once → counts as a completed referral!
        </td>
      </tr>
    </table>
  </div>

  <div style="text-align: center; margin: 28px 0;">
    <a href="https://apexaistudy.vercel.app/account"
      style="background: linear-gradient(135deg, #6366f1, #9333ea);
      color: white; padding: 14px 32px; border-radius: 10px;
      text-decoration: none; font-weight: 700; font-size: 15px;
      display: inline-block;">
      Get My Referral Link →
    </a>
  </div>

  <p style="color: #555; line-height: 1.6; font-size: 14px;">
    Each completed referral gets you closer to the top spot. Even if you 
    don't win, your friends get free access to all APEX AI study tools!
  </p>

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

    const displayName = username || 'there'
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
        subject: '🏆 Refer a Friend & Win ChatGPT Plus — APEX AI Study Hub',
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
      JSON.stringify({ success: true, message: 'Referral announcement email sent', id: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})