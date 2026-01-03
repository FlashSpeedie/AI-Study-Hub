-- Add category column to tasks table for better organization
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category text DEFAULT 'General';

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);