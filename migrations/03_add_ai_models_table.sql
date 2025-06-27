
CREATE TABLE ai_models (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  api_key TEXT NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  model VARCHAR(255) NOT NULL,
  temperature INTEGER DEFAULT 70 NOT NULL,
  max_tokens INTEGER DEFAULT 1000 NOT NULL,
  system_prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index on is_default for faster queries
CREATE INDEX idx_ai_models_is_default ON ai_models(is_default);
CREATE INDEX idx_ai_models_is_active ON ai_models(is_active);
