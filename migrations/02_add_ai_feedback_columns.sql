
ALTER TABLE feedback
ADD COLUMN is_ai_generated boolean DEFAULT false NOT NULL,
ADD COLUMN ai_analysis_status text,
ADD COLUMN ai_confidence_score integer;
