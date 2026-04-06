import { supabase } from '@/integrations/supabase/client'

type ReferralUseRow = {
  id: string
  has_used_tool: boolean
  tools_used: string[] | null
}

const TRACKED_TOOLS = [
  'grades', 'notes', 'flashcards', 'quiz',
  'ai-assistant', 'ai-detector', 'pomodoro',
  'tasks', 'classroom', 'recordings'
]

export async function trackToolUse(userId: string, toolName: string) {
  if (!TRACKED_TOOLS.includes(toolName)) return

  try {
    const { data: referralUse, error } = await (supabase as any)
      .from('referral_uses')
      .select('id, has_used_tool, tools_used')
      .eq('referred_user_id', userId)
      .single()

    if (error || !referralUse) return

    const toolsUsed: string[] = referralUse.tools_used || []
    if (toolsUsed.includes(toolName)) return

    const updatedTools = [...toolsUsed, toolName]
    const isComplete = !referralUse.has_used_tool

    await (supabase as any)
      .from('referral_uses')
      .update({
        tools_used: updatedTools,
        has_used_tool: true,
        completed_at: isComplete ? new Date().toISOString() : undefined,
      })
      .eq('id', referralUse.id)

  } catch (err) {
    console.error('Failed to track tool use:', err)
  }
}