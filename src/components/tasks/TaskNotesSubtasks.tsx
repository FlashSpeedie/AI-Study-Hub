import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, Circle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskNotesSubtasksProps {
  notes: string;
  subtasks: Subtask[];
  onNotesChange: (notes: string) => void;
  onSubtasksChange: (subtasks: Subtask[]) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function TaskNotesSubtasks({
  notes,
  subtasks,
  onNotesChange,
  onSubtasksChange,
  isExpanded,
  onToggleExpand,
}: TaskNotesSubtasksProps) {
  const [newSubtask, setNewSubtask] = useState('');

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    const subtask: Subtask = {
      id: crypto.randomUUID(),
      title: newSubtask.trim(),
      completed: false,
    };
    onSubtasksChange([...subtasks, subtask]);
    setNewSubtask('');
  };

  const toggleSubtask = (id: string) => {
    onSubtasksChange(
      subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    );
  };

  const deleteSubtask = (id: string) => {
    onSubtasksChange(subtasks.filter(s => s.id !== id));
  };

  const completedCount = subtasks.filter(s => s.completed).length;

  return (
    <div className="mt-2">
      <button
        onClick={onToggleExpand}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <FileText className="w-4 h-4" />
        <span>Notes & Subtasks</span>
        {subtasks.length > 0 && (
          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
            {completedCount}/{subtasks.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-3 pl-4 border-l-2 border-muted"
          >
            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Add notes for this task..."
                className="min-h-[60px] text-sm resize-none"
              />
            </div>

            {/* Subtasks */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Subtasks {subtasks.length > 0 && `(${completedCount}/${subtasks.length})`}
              </label>
              
              {/* Progress bar for subtasks */}
              {subtasks.length > 0 && (
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                  <motion.div
                    className="h-full rounded-full bg-emerald"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedCount / subtasks.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <AnimatePresence>
                  {subtasks.map((subtask) => (
                    <motion.div
                      key={subtask.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md bg-muted/50 group",
                        subtask.completed && "opacity-60"
                      )}
                    >
                      <button onClick={() => toggleSubtask(subtask.id)}>
                        {subtask.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        )}
                      </button>
                      <span className={cn(
                        "flex-1 text-sm",
                        subtask.completed && "line-through text-muted-foreground"
                      )}>
                        {subtask.title}
                      </span>
                      <button
                        onClick={() => deleteSubtask(subtask.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-ruby hover:text-ruby"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Add subtask input */}
              <div className="flex gap-2 mt-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                  placeholder="Add a subtask..."
                  className="text-sm h-8"
                />
                <Button size="sm" variant="outline" onClick={addSubtask} className="h-8">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
