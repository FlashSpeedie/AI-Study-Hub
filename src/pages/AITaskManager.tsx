import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Calendar, 
  Flag, 
  CheckCircle2, 
  Circle, 
  Wand2,
  Loader2,
  Bell,
  BellOff,
  CalendarDays,
  List,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, isBefore, parseISO, differenceInMinutes } from 'date-fns';
import TaskCalendarView from '@/components/tasks/TaskCalendarView';
import TaskTimePicker from '@/components/tasks/TaskTimePicker';
import TaskNotesSubtasks, { Subtask } from '@/components/tasks/TaskNotesSubtasks';
import SmartScheduler from '@/components/tasks/SmartScheduler';
import DurationPicker from '@/components/tasks/DurationPicker';
import CalendarExport from '@/components/tasks/CalendarExport';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  category: string;
  created_at: string;
  notes?: string;
  subtasks?: Subtask[];
  duration?: number;
}

type SuggestionTask = {
  title: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  suggested_due_date: string;
  suggested_time?: string;
  estimated_duration?: number;
};

export default function AITaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState('General');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const categories = ['General', 'Study', 'Review', 'Practice', 'Research', 'Writing', 'Organization', 'Exam Prep', 'Project', 'Reading', 'Other'];

  // Task notifications hook
  const { 
    permissionGranted, 
    notificationsEnabled, 
    requestPermission, 
    toggleNotifications 
  } = useTaskNotifications({ 
    tasks, 
    enabled: true,
    reminderMinutes: 5 
  });

  useEffect(() => {
    fetchTasks();
    requestPermission();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks((data || []).map(t => ({
        ...t,
        priority: t.priority as 'low' | 'medium' | 'high',
        due_date: t.due_date ?? null,
        category: t.category ?? 'General',
        notes: (t as any).notes ?? '',
        subtasks: (t as any).subtasks ?? [],
        duration: (t as any).duration ?? 30,
      })));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  // Get full due date for smart scheduler
  const getFullDueDate = () => {
    if (!dueDate) return null;
    if (dueTime) {
      return `${dueDate}T${dueTime}:00`;
    }
    return `${dueDate}T23:59:00`;
  };

  const addTask = async () => {
    if (!newTask.trim()) {
      toast.error('Please enter a task');
      return;
    }

    setIsAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let fullDueDate: string | null = null;
      if (dueDate) {
        fullDueDate = dueTime ? `${dueDate}T${dueTime}:00` : `${dueDate}T23:59:00`;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: newTask.trim(),
          priority,
          category,
          due_date: fullDueDate,
          user_id: user.id,
          completed: false,
          notes: '',
          subtasks: [],
          duration,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const newTaskData: Task = {
        ...data,
        priority: data.priority as 'low' | 'medium' | 'high',
        due_date: data.due_date ?? null,
        category: data.category ?? 'General',
        notes: (data as any).notes ?? '',
        subtasks: (data as any).subtasks ?? [],
        duration: (data as any).duration ?? 30,
      };

      setTasks([newTaskData, ...tasks]);
      setNewTask('');
      setDueDate('');
      setDueTime('');
      setPriority('medium');
      setCategory('General');
      setDuration(30);
      toast.success('Task added');
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task');
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !completed })
        .eq('id', id);

      if (error) throw error;

      setTasks(tasks.map(t => t.id === id ? { ...t, completed: !completed } : t));
      toast.success(completed ? 'Task marked incomplete' : 'Task completed!');
    } catch (error) {
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Task deleted');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const updateTaskNotesSubtasks = async (taskId: string, notes: string, subtasks: Subtask[]) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ notes, subtasks } as any)
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, notes, subtasks } : t
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const generateAISuggestions = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what tasks you need help with');
      return;
    }

    setIsGenerating(true);
    setSuggestions([]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to use AI suggestions');
        return;
      }

      const { data, error } = await supabase.functions.invoke('ai-task-suggest', {
        body: { prompt: aiPrompt }
      });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data?.error) {
        if (data.error.includes('429') || data.error.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please try again later.');
        } else if (data.error.includes('402')) {
          toast.error('Please add credits to your workspace.');
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        toast.success('AI generated task suggestions!');
      }
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      toast.error('Failed to generate suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const addSuggestion = async (suggestion: SuggestionTask) => {
    setIsAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: suggestion.title,
          priority: suggestion.priority,
          category: suggestion.category,
          due_date: suggestion.suggested_due_date || null,
          user_id: user.id,
          completed: false,
          notes: '',
          subtasks: [],
          duration: 30,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const newTaskData: Task = {
        ...data,
        priority: data.priority as 'low' | 'medium' | 'high',
        due_date: data.due_date ?? null,
        category: data.category ?? 'General',
        notes: '',
        subtasks: [],
        duration: 30,
      };

      setTasks([newTaskData, ...tasks]);
      setSuggestions(suggestions.filter(s => s.title !== suggestion.title));
      toast.success('Task added from suggestion');
    } catch (error) {
      console.error('Error adding suggestion:', error);
      toast.error('Failed to add task');
    } finally {
      setIsAdding(false);
    }
  };

  // Get overdue and upcoming tasks
  const now = new Date();
  const overdueTasks = tasks.filter(t => {
    if (t.completed || !t.due_date) return false;
    return isBefore(parseISO(t.due_date), now);
  });

  const upcomingSoonTasks = tasks.filter(t => {
    if (t.completed || !t.due_date) return false;
    const dueDate = parseISO(t.due_date);
    const diff = differenceInMinutes(dueDate, now);
    return diff > 0 && diff <= 60;
  });

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filter === 'all' ? true : filter === 'active' ? !task.completed : task.completed;
    const categoryMatch = categoryFilter === 'all' ? true : task.category === categoryFilter;
    return statusMatch && categoryMatch;
  });

  const uniqueCategories = [...new Set(tasks.map(t => t.category))];

  const completedCount = tasks.filter(t => t.completed).length;

  const priorityColors = {
    low: 'bg-sky/20 text-sky border-sky/30',
    medium: 'bg-amber/20 text-amber border-amber/30',
    high: 'bg-ruby/20 text-ruby border-ruby/30',
  };

  const formatTaskDateTime = (dueDate: string) => {
    const date = parseISO(dueDate);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === 23 && minutes === 59) {
      return format(date, 'MMM d, yyyy');
    }
    return format(date, 'MMM d, yyyy h:mm a');
  };

  const getTaskUrgency = (task: Task) => {
    if (!task.due_date || task.completed) return null;
    const dueDate = parseISO(task.due_date);
    const diff = differenceInMinutes(dueDate, now);
    if (diff < 0) return 'overdue';
    if (diff <= 5) return 'imminent';
    if (diff <= 60) return 'soon';
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-in">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-display font-bold">AI Task Manager</h1>
          </div>
          <p className="text-muted-foreground">Intelligent task management powered by AI</p>
        </div>
        
        <div className="flex items-center gap-2">
          <CalendarExport tasks={tasks} />
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={notificationsEnabled ? "default" : "outline"}
                size="icon"
                onClick={() => {
                  if (!permissionGranted) {
                    requestPermission();
                  }
                  toggleNotifications();
                }}
                className="relative"
              >
                {notificationsEnabled ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
                {notificationsEnabled && upcomingSoonTasks.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-ruby text-white text-xs rounded-full flex items-center justify-center">
                    {upcomingSoonTasks.length}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {notificationsEnabled ? 'Notifications enabled (5 min reminder)' : 'Enable notifications'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Overdue Tasks Alert */}
      <AnimatePresence>
        {overdueTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-4 mb-6 border-ruby/30 bg-ruby/5">
              <div className="flex items-center gap-2 text-ruby mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Overdue Tasks ({overdueTasks.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {overdueTasks.slice(0, 5).map(task => (
                  <Badge key={task.id} variant="outline" className="border-ruby/30 text-ruby">
                    {task.title}
                  </Badge>
                ))}
                {overdueTasks.length > 5 && (
                  <Badge variant="outline" className="border-ruby/30 text-ruby">
                    +{overdueTasks.length - 5} more
                  </Badge>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Suggestions Section */}
      <Card className="p-5 mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Task Suggestions</h3>
        </div>
        <div className="flex gap-2 mb-4">
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe what you need to accomplish... (e.g., 'I need to prepare for my chemistry exam next week')"
            className="min-h-[80px] resize-none"
          />
        </div>
        <Button 
          onClick={generateAISuggestions} 
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Suggestions
            </>
          )}
        </Button>

        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-2"
            >
              <p className="text-sm text-muted-foreground">Click to add:</p>
              {suggestions.map((suggestion, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <button
                    onClick={() => addSuggestion(suggestion)}
                    disabled={isAdding}
                    className="w-full text-left p-3 rounded-lg bg-background/50 hover:bg-background border border-border hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <Plus className="w-4 h-4 text-primary" />
                        <span className="font-medium">{suggestion.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {suggestion.category}
                        </Badge>
                        <Badge className={cn('text-xs', priorityColors[suggestion.priority])}>
                          {suggestion.priority}
                        </Badge>
                      </div>
                    </div>
                    {suggestion.suggested_due_date && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground ml-7 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(suggestion.suggested_due_date), 'MMM d, yyyy')}
                        </span>
                        {suggestion.suggested_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {suggestion.suggested_time}
                          </span>
                        )}
                        {suggestion.estimated_duration && (
                          <span className="text-muted-foreground">
                            ({suggestion.estimated_duration} min)
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Add Task */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col gap-3">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            className="flex-1"
          />
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v: 'low' | 'medium' | 'high') => setPriority(v)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <Flag className="w-3 h-3 text-sky" />
                    Low
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <Flag className="w-3 h-3 text-amber" />
                    Medium
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <Flag className="w-3 h-3 text-ruby" />
                    High
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-40"
            />
            <TaskTimePicker 
              value={dueTime} 
              onChange={setDueTime}
              className="w-32"
            />
            <DurationPicker
              value={duration}
              onChange={setDuration}
              className="w-32"
            />
            <Button onClick={addTask} disabled={isAdding} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>
          
          {/* Smart Scheduler */}
          {dueDate && (
            <SmartScheduler
              tasks={tasks}
              newTaskDate={getFullDueDate()}
              newTaskDuration={duration}
            />
          )}
        </div>
      </Card>

      {/* View Toggle & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        {tasks.length > 0 && (
          <div className="flex-1 w-full sm:max-w-xs">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completedCount}/{tasks.length}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div 
                className="h-full rounded-full bg-emerald"
                initial={{ width: 0 }}
                animate={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none gap-1"
            >
              <List className="w-4 h-4" />
              List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="rounded-none gap-1"
            >
              <CalendarDays className="w-4 h-4" />
              Calendar
            </Button>
          </div>
          
          {viewMode === 'list' && (
            <>
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('active')}
              >
                Active
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('completed')}
              >
                Completed
              </Button>
              {uniqueCategories.length > 0 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'calendar' ? (
        <TaskCalendarView 
          tasks={tasks} 
          onToggleTask={toggleTask}
        />
      ) : (
        <>
          {filteredTasks.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {filter === 'all' ? 'No tasks yet' : `No ${filter} tasks`}
              </h3>
              <p className="text-muted-foreground">
                {filter === 'all' 
                  ? 'Add your first task or use AI to generate suggestions' 
                  : 'Try a different filter'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredTasks.map((task, i) => {
                  const urgency = getTaskUrgency(task);
                  const isExpanded = expandedTaskId === task.id;
                  const subtaskProgress = task.subtasks && task.subtasks.length > 0
                    ? task.subtasks.filter(s => s.completed).length / task.subtasks.length
                    : null;
                  
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <Card className={cn(
                        "p-4 transition-all",
                        task.completed && "opacity-60",
                        urgency === 'overdue' && "border-ruby/50 bg-ruby/5",
                        urgency === 'imminent' && "border-amber/50 bg-amber/5 animate-pulse",
                        urgency === 'soon' && "border-amber/30 bg-amber/5"
                      )}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleTask(task.id, task.completed)}
                            className="flex-shrink-0"
                          >
                            {task.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald" />
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "block truncate",
                                task.completed && "line-through text-muted-foreground"
                              )}>
                                {task.title}
                              </span>
                              {urgency === 'overdue' && (
                                <Badge variant="destructive" className="text-xs">Overdue</Badge>
                              )}
                              {urgency === 'imminent' && (
                                <Badge className="text-xs bg-amber text-amber-foreground animate-pulse">Due Soon!</Badge>
                              )}
                              {subtaskProgress !== null && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(subtaskProgress * 100)}% subtasks
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {task.category && task.category !== 'General' && (
                                <Badge variant="outline" className="text-xs">
                                  {task.category}
                                </Badge>
                              )}
                              {task.due_date && (
                                <span className={cn(
                                  "text-xs flex items-center gap-1",
                                  urgency === 'overdue' ? "text-ruby" : "text-muted-foreground"
                                )}>
                                  <Clock className="w-3 h-3" />
                                  {formatTaskDateTime(task.due_date)}
                                </span>
                              )}
                              {task.duration && task.duration !== 30 && (
                                <span className="text-xs text-muted-foreground">
                                  ({task.duration} min)
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge className={cn('text-xs', priorityColors[task.priority as keyof typeof priorityColors])}>
                            {task.priority}
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteTask(task.id)} 
                            className="text-ruby hover:text-ruby flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Notes & Subtasks */}
                        <TaskNotesSubtasks
                          notes={task.notes || ''}
                          subtasks={task.subtasks || []}
                          onNotesChange={(notes) => updateTaskNotesSubtasks(task.id, notes, task.subtasks || [])}
                          onSubtasksChange={(subtasks) => updateTaskNotesSubtasks(task.id, task.notes || '', subtasks)}
                          isExpanded={isExpanded}
                          onToggleExpand={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        />
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  );
}
