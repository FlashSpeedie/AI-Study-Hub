
-- Create note_folders table for organizing notes
CREATE TABLE public.note_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for note_folders
CREATE POLICY "Users can view own folders"
ON public.note_folders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own folders"
ON public.note_folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders"
ON public.note_folders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders"
ON public.note_folders FOR DELETE
USING (auth.uid() = user_id);

-- Add folder_id and color to notes table
ALTER TABLE public.notes 
ADD COLUMN folder_id UUID REFERENCES public.note_folders(id) ON DELETE SET NULL,
ADD COLUMN color TEXT DEFAULT '#6366f1';
