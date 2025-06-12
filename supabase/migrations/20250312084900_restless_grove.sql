/*
  # Add n8n_chat_histories table
  
  1. New Table
    - Creates table for storing chat history
    - Adds basic schema for message storage
  
  2. Security
    - Enables RLS
    - Adds policies for access control
*/

-- Create n8n_chat_histories table
CREATE TABLE IF NOT EXISTS n8n_chat_histories (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  message JSONB NOT NULL
);

-- Create index for session_id
CREATE INDEX IF NOT EXISTS idx_chat_histories_session ON n8n_chat_histories(session_id);

-- Enable RLS
ALTER TABLE n8n_chat_histories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow users to view their own chat history"
  ON n8n_chat_histories
  FOR SELECT
  TO authenticated
  USING (
    session_id = auth.uid()::text
  );

CREATE POLICY "Allow n8n to insert chat messages"
  ON n8n_chat_histories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON n8n_chat_histories TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE n8n_chat_histories_id_seq TO authenticated;