-- Fix column names to match codebase
-- Migration: 20260322000000_grade_tables.sql used points_earned and points_possible
-- But the codebase uses earned_points and total_points
-- This migration renames the columns to match

-- Rename columns to match the codebase
ALTER TABLE public.assignments 
  RENAME COLUMN points_earned TO earned_points;

ALTER TABLE public.assignments 
  RENAME COLUMN points_possible TO total_points;
