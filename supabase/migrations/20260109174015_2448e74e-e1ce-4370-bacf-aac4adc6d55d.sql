-- Create lecture_recordings table
CREATE TABLE public.lecture_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  year_id UUID NOT NULL,
  semester_id UUID NOT NULL,
  name TEXT NOT NULL,
  audio_url TEXT,
  duration INTEGER DEFAULT 0,
  transcript TEXT,
  notes TEXT,
  summary TEXT,
  key_points JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'recording', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lecture_recordings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own recordings" 
ON public.lecture_recordings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings" 
ON public.lecture_recordings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings" 
ON public.lecture_recordings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings" 
ON public.lecture_recordings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lecture_recordings_updated_at
BEFORE UPDATE ON public.lecture_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();