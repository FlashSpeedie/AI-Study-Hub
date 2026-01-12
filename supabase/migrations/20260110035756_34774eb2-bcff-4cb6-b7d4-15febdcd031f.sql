-- Create storage bucket for lecture recordings audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lecture-audio', 'lecture-audio', false, 52428800, ARRAY['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for lecture-audio bucket
-- Users can view their own audio files
CREATE POLICY "Users can view their own lecture audio"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lecture-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload their own audio files
CREATE POLICY "Users can upload their own lecture audio"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'lecture-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own audio files
CREATE POLICY "Users can update their own lecture audio"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'lecture-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own audio files
CREATE POLICY "Users can delete their own lecture audio"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'lecture-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);