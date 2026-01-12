-- Change ID columns from UUID to TEXT to support store-generated IDs
ALTER TABLE public.lecture_recordings 
  ALTER COLUMN year_id TYPE text USING year_id::text,
  ALTER COLUMN semester_id TYPE text USING semester_id::text,
  ALTER COLUMN subject_id TYPE text USING subject_id::text;