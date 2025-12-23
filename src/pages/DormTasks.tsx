import { useState } from 'react';
import { motion } from 'framer-motion';
import { ListTodo, Plus, Trash2, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DormTasks() {
  const { tasks, addTask, toggleTask, deleteTask } = useStore();
  const [newTask, setNewTask] = useState('');

  const handleAddTask = () => {
    if (!newTask.trim()) {
      toast.error('Please enter a task');
      return;
    }
    addTask(newTask.trim());
    setNewTask('');
    toast.success('Task added');
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="max-w-2xl mx-auto animate-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <ListTodo className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-display font-bold">Dorm Tasks</h1>
        </div>
        <p className="text-muted-foreground">Manage your residential to-dos</p>
      </div>

      {/* Add Task */}
      <Card className="p-4 mb-6">
        <div className="flex gap-2">
          <Input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          />
          <Button onClick={handleAddTask} className="gap-2">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </Card>

      {/* Progress */}
      {tasks.length > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{completedCount}/{tasks.length}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full rounded-full bg-emerald transition-all duration-500"
              style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card className="p-8 text-center">
          <ListTodo className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
          <p className="text-muted-foreground">Add your first task to get started</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={cn("p-4 flex items-center gap-3 transition-opacity", task.completed && "opacity-60")}>
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id)}
                />
                <span className={cn("flex-1", task.completed && "line-through text-muted-foreground")}>
                  {task.title}
                </span>
                <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-ruby hover:text-ruby">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
