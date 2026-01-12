-- Add notes, subtasks, and duration columns to tasks table for enhanced task management
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subtasks jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS duration integer DEFAULT 30;