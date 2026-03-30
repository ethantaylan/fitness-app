ALTER TABLE program_sessions
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

DROP POLICY IF EXISTS ps_update ON program_sessions;
CREATE POLICY ps_update ON program_sessions FOR UPDATE USING (
  week_id IN (
    SELECT pw.id
    FROM program_weeks pw
    JOIN programs p ON p.id = pw.program_id
    WHERE p.user_id = auth_user_id()
  )
);
