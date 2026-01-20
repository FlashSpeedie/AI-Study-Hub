import { Sparkles, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/store/useStore';
import { isBefore, parseISO, differenceInMinutes } from 'date-fns';

export function MiniTaskPreview() {
  const { tasks } = useStore();

  const now = new Date();
  const pendingTasks = tasks.filter(t => !t.completed);
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.dueDate) return false;
    return isBefore(t.dueDate, now);
  });
  const urgentTasks = pendingTasks.filter(t => {
    if (!t.dueDate || overdueTasks.includes(t)) return false;
    const diff = differenceInMinutes(t.dueDate, now);
    return diff <= 60;
  });

  // Show only top 3 urgent/overdue tasks
  const displayTasks = [...overdueTasks, ...urgentTasks].slice(0, 3);

  if (displayTasks.length === 0) return null;

  const getUrgencyClass = (task: typeof tasks[0]) => {
    if (overdueTasks.includes(task)) return 'border-ruby/50 bg-ruby/5';
    return 'border-amber/50 bg-amber/5';
  };

  return (
    <Card className="fixed top-4 right-4 z-40 p-3 bg-background/95 backdrop-blur-sm border shadow-lg max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Tasks ({pendingTasks.length})</span>
      </div>
      <div className="space-y-2">
        {displayTasks.map(task => (
          <div
            key={task.id}
            className={`p-2 rounded border ${getUrgencyClass(task)}`}
          >
            <div className="flex items-start gap-2">
              <Circle className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">{task.title}</div>
                {task.dueDate && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {overdueTasks.includes(task) && (
                      <span className="flex items-center gap-1 text-ruby">
                        <AlertTriangle className="w-3 h-3" />
                        Overdue
                      </span>
                    )}
                    {urgentTasks.includes(task) && !overdueTasks.includes(task) && (
                      <span className="text-amber">Due soon</span>
                    )}
                  </div>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs mt-1 ${
                    task.priority === 'high' ? 'border-ruby/30 text-ruby' :
                    task.priority === 'medium' ? 'border-amber/30 text-amber' :
                    'border-sky/30 text-sky'
                  }`}
                >
                  {task.priority}
                </Badge>
              </div>
            </div>
          </div>
        ))}
        {pendingTasks.length > 3 && (
          <div className="text-xs text-muted-foreground text-center">
            +{pendingTasks.length - 3} more tasks
          </div>
        )}
      </div>
    </Card>
  );
}