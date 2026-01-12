import { useMemo } from 'react';
import { format, parseISO, addMinutes, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  due_date: string | null;
  duration?: number;
  completed: boolean;
}

interface SmartSchedulerProps {
  tasks: Task[];
  newTaskDate: string | null;
  newTaskDuration: number;
}

interface TimeConflict {
  existingTask: Task;
  overlapMinutes: number;
}

export function checkTimeConflict(
  tasks: Task[],
  newStart: Date,
  newDuration: number,
  excludeTaskId?: string
): TimeConflict[] {
  const newEnd = addMinutes(newStart, newDuration);
  const conflicts: TimeConflict[] = [];

  tasks.forEach(task => {
    if (task.completed || !task.due_date || task.id === excludeTaskId) return;
    
    const taskStart = parseISO(task.due_date);
    const taskDuration = task.duration || 30;
    const taskEnd = addMinutes(taskStart, taskDuration);

    // Check if there's overlap
    const hasOverlap = 
      (isWithinInterval(newStart, { start: taskStart, end: taskEnd }) && !isBefore(newStart, taskStart)) ||
      (isWithinInterval(newEnd, { start: taskStart, end: taskEnd }) && !isAfter(newEnd, taskEnd)) ||
      (isBefore(newStart, taskStart) && isAfter(newEnd, taskEnd)) ||
      (isAfter(newStart, taskStart) && isBefore(newEnd, taskEnd));

    if (hasOverlap) {
      // Calculate overlap minutes
      const overlapStart = isAfter(newStart, taskStart) ? newStart : taskStart;
      const overlapEnd = isBefore(newEnd, taskEnd) ? newEnd : taskEnd;
      const overlapMinutes = Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / 60000);
      
      if (overlapMinutes > 0) {
        conflicts.push({ existingTask: task, overlapMinutes: Math.round(overlapMinutes) });
      }
    }
  });

  return conflicts;
}

export function suggestNextAvailableSlot(
  tasks: Task[],
  preferredStart: Date,
  duration: number
): Date {
  let candidateStart = preferredStart;
  let maxIterations = 100; // Prevent infinite loops

  while (maxIterations > 0) {
    const conflicts = checkTimeConflict(tasks, candidateStart, duration);
    
    if (conflicts.length === 0) {
      return candidateStart;
    }

    // Find the latest end time among conflicting tasks
    let latestEnd = candidateStart;
    conflicts.forEach(conflict => {
      const taskStart = parseISO(conflict.existingTask.due_date!);
      const taskEnd = addMinutes(taskStart, conflict.existingTask.duration || 30);
      if (isAfter(taskEnd, latestEnd)) {
        latestEnd = taskEnd;
      }
    });

    // Move candidate start to after the latest conflict
    candidateStart = addMinutes(latestEnd, 5); // 5-minute buffer
    maxIterations--;
  }

  return candidateStart;
}

export default function SmartScheduler({ tasks, newTaskDate, newTaskDuration }: SmartSchedulerProps) {
  const conflicts = useMemo(() => {
    if (!newTaskDate) return [];
    try {
      const startDate = parseISO(newTaskDate);
      return checkTimeConflict(tasks, startDate, newTaskDuration);
    } catch {
      return [];
    }
  }, [tasks, newTaskDate, newTaskDuration]);

  const suggestedSlot = useMemo(() => {
    if (!newTaskDate || conflicts.length === 0) return null;
    try {
      const preferredStart = parseISO(newTaskDate);
      return suggestNextAvailableSlot(tasks, preferredStart, newTaskDuration);
    } catch {
      return null;
    }
  }, [tasks, newTaskDate, newTaskDuration, conflicts]);

  if (!newTaskDate) return null;

  return (
    <div className="mt-2">
      {conflicts.length > 0 ? (
        <div className="p-3 rounded-lg bg-amber/10 border border-amber/30">
          <div className="flex items-center gap-2 text-amber mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium text-sm">Schedule Conflict Detected</span>
          </div>
          <div className="space-y-1">
            {conflicts.map((conflict, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>
                  Overlaps with "{conflict.existingTask.title}" by {conflict.overlapMinutes} min
                </span>
              </div>
            ))}
          </div>
          {suggestedSlot && (
            <div className="mt-2 pt-2 border-t border-amber/30">
              <span className="text-sm text-muted-foreground">Suggested time: </span>
              <Badge variant="outline" className="text-emerald border-emerald/30">
                {format(suggestedSlot, 'MMM d, h:mm a')}
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <div className={cn(
          "flex items-center gap-2 text-sm text-emerald",
          "p-2 rounded-lg bg-emerald/10"
        )}>
          <CheckCircle className="w-4 h-4" />
          <span>No scheduling conflicts</span>
        </div>
      )}
    </div>
  );
}
