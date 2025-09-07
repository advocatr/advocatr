-- Add video recording time limit to exercises table
-- This allows each exercise to have its own maximum recording duration

ALTER TABLE exercises 
ADD COLUMN video_recording_time_limit INTEGER DEFAULT 300;

-- Add comment to explain the field
COMMENT ON COLUMN exercises.video_recording_time_limit IS 'Maximum recording duration in seconds (default: 300 = 5 minutes)';
