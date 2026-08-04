/*
# Create tasks table

1. Purpose
   Adds a task management table to the ERP so staff can track assigned work
   items with priorities, due dates, and statuses. This migration does NOT
   modify any existing tables.

2. New Tables
   - `tasks`
     - id (uuid, PK)
     - title (text, not null)
     - description (text, nullable)
     - status (text: pending|in_progress|completed|cancelled, default 'pending')
     - priority (text: low|medium|high|urgent, default 'medium')
     - due_date (timestamptz, nullable)
     - assigned_to (uuid, nullable — references employees in the app layer)
     - created_by (uuid, nullable, references auth.users(id) ON DELETE SET NULL)
     - created_at (timestamptz, default now())
     - updated_at (timestamptz, default now())

3. Indexes
   - idx_tasks_status, idx_tasks_assigned_to, idx_tasks_due_date, idx_tasks_created_at

4. Security
   - RLS enabled, scoped TO authenticated. Full CRUD for authenticated staff.

5. Notes
   - assigned_to is NOT FK-constrained to employees because the employees
     table may not exist in all environments; the application layer validates.
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date timestamptz,
  assigned_to uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_tasks" ON tasks;
CREATE POLICY "select_tasks" ON tasks FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_tasks" ON tasks;
CREATE POLICY "insert_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_tasks" ON tasks;
CREATE POLICY "update_tasks" ON tasks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_tasks" ON tasks;
CREATE POLICY "delete_tasks" ON tasks FOR DELETE
  TO authenticated USING (true);
