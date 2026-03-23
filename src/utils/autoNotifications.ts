import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  title: string;
  due_date?: string | null;
  completed: boolean;
}

interface Assignment {
  id: string;
  name: string;
  date?: string;
}

export async function checkDueTomorrow(userId: string, tasks: Task[], assignments: Assignment[]) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const toInsert: any[] = [];

  for (const task of tasks) {
    const taskDate = task.due_date 
      ? new Date(task.due_date).toISOString().split('T')[0] 
      : null;
    if (taskDate === tomorrowStr && !task.completed) {
      toInsert.push({
        user_id: userId,
        title: 'Task Due Tomorrow',
        message: `"${task.title}" is due tomorrow`,
        type: 'warning',
        link: '/tasks',
        source_id: `task-due-${task.id}-${tomorrowStr}`
      });
    }
  }

  for (const assignment of assignments) {
    if (assignment.date?.startsWith(tomorrowStr)) {
      toInsert.push({
        user_id: userId,
        title: 'Assignment Due Tomorrow',
        message: `"${assignment.name}" is due tomorrow`,
        type: 'warning',
        link: '/grades',
        source_id: `assignment-due-${assignment.id}-${tomorrowStr}`
      });
    }
  }

  if (toInsert.length > 0) {
    try {
      await supabase.from('notifications').upsert(toInsert, {
        onConflict: 'user_id,source_id',
        ignoreDuplicates: true
      });
    } catch (error) {
      console.error('Error creating notifications:', error);
    }
  }
}
