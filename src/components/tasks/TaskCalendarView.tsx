import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Circle,
  Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO, getHours, getMinutes } from 'date-fns';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  category: string;
  created_at: string;
}

interface TaskCalendarViewProps {
  tasks: Task[];
  onToggleTask: (id: string, completed: boolean) => void;
  onSelectDate?: (date: Date) => void;
}

const priorityColors = {
  low: 'bg-sky/20 text-sky border-sky/30',
  medium: 'bg-amber/20 text-amber border-amber/30',
  high: 'bg-ruby/20 text-ruby border-ruby/30',
};

const priorityDotColors = {
  low: 'bg-sky',
  medium: 'bg-amber',
  high: 'bg-ruby',
};

export default function TaskCalendarView({ tasks, onToggleTask, onSelectDate }: TaskCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week the month starts on (0 = Sunday)
  const startDayOfWeek = monthStart.getDay();
  
  // Create padding for days before month starts
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) => null);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (task.due_date) {
        const dateKey = format(parseISO(task.due_date), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, task]);
      }
    });
    return map;
  }, [tasks]);

  const getTasksForDate = (date: Date): Task[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return tasksByDate.get(dateKey) || [];
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onSelectDate?.(date);
  };

  const formatTaskTime = (dueDate: string) => {
    const date = parseISO(dueDate);
    const hours = getHours(date);
    const minutes = getMinutes(date);
    if (hours === 23 && minutes === 59) return null; // Default time, don't show
    return format(date, 'h:mm a');
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}

        {/* Padding Days */}
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} className="aspect-square" />
        ))}

        {/* Calendar Days */}
        {daysInMonth.map(day => {
          const dayTasks = getTasksForDate(day);
          const hasActiveTasks = dayTasks.some(t => !t.completed);
          const hasHighPriority = dayTasks.some(t => t.priority === 'high' && !t.completed);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <motion.button
              key={day.toISOString()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDateClick(day)}
              className={cn(
                "aspect-square p-1 rounded-lg border transition-all relative flex flex-col items-center justify-start",
                isToday(day) && "ring-2 ring-primary ring-offset-1",
                isSelected && "bg-primary/10 border-primary",
                !isSelected && "hover:bg-muted/50 border-transparent hover:border-border",
                hasHighPriority && !isSelected && "bg-ruby/5"
              )}
            >
              <span className={cn(
                "text-sm font-medium",
                isToday(day) && "text-primary",
                !isSameMonth(day, currentMonth) && "text-muted-foreground"
              )}>
                {format(day, 'd')}
              </span>
              
              {/* Task Indicators */}
              {dayTasks.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full">
                  {dayTasks.slice(0, 3).map((task, i) => (
                    <div
                      key={task.id}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        task.completed ? "bg-emerald" : priorityDotColors[task.priority]
                      )}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">+{dayTasks.length - 3}</span>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Date Tasks */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <Card className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-primary" />
                Tasks for {format(selectedDate, 'EEEE, MMMM d')}
              </h4>
              
              {selectedDateTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks scheduled for this day
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDateTasks
                    .sort((a, b) => {
                      // Sort by time, then by priority
                      if (a.due_date && b.due_date) {
                        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                      }
                      return 0;
                    })
                    .map(task => {
                      const taskTime = task.due_date ? formatTaskTime(task.due_date) : null;
                      
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border transition-all",
                            task.completed ? "bg-muted/30 opacity-60" : "bg-background hover:bg-muted/20"
                          )}
                        >
                          <button
                            onClick={() => onToggleTask(task.id, task.completed)}
                            className="flex-shrink-0"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald" />
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              "block truncate font-medium",
                              task.completed && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              {taskTime && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {taskTime}
                                </span>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {task.category}
                              </Badge>
                            </div>
                          </div>
                          
                          <Badge className={cn('text-xs', priorityColors[task.priority])}>
                            <Flag className="w-3 h-3 mr-1" />
                            {task.priority}
                          </Badge>
                        </motion.div>
                      );
                    })}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming Tasks Summary */}
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10">
        <h4 className="font-semibold mb-3">📊 This Month's Overview</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">
              {tasks.filter(t => {
                if (!t.due_date) return false;
                const taskDate = parseISO(t.due_date);
                return isSameMonth(taskDate, currentMonth) && !t.completed;
              }).length}
            </div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald">
              {tasks.filter(t => {
                if (!t.due_date) return false;
                const taskDate = parseISO(t.due_date);
                return isSameMonth(taskDate, currentMonth) && t.completed;
              }).length}
            </div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-ruby">
              {tasks.filter(t => {
                if (!t.due_date) return false;
                const taskDate = parseISO(t.due_date);
                return isSameMonth(taskDate, currentMonth) && t.priority === 'high' && !t.completed;
              }).length}
            </div>
            <div className="text-xs text-muted-foreground">High Priority</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
