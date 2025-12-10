CREATE TABLE tasks (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    notes         TEXT,
    status        TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
    position      INTEGER NOT NULL DEFAULT 0,
    priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    work_type     TEXT NOT NULL DEFAULT 'shallow' CHECK (work_type IN ('deep', 'shallow')),
    energy        TEXT NOT NULL DEFAULT 'medium' CHECK (energy IN ('low', 'medium', 'high')),
    estimate_min  INTEGER,
    context       TEXT,
    due_date      TEXT,
    next_action   TEXT,
    subtasks      TEXT NOT NULL DEFAULT '[]',
    strategies    TEXT NOT NULL DEFAULT '[]',
    confidence    REAL,
    source_note   TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    completed_at  TEXT
);
CREATE INDEX tasks_column ON tasks (status, position);
CREATE INDEX tasks_due ON tasks (due_date) WHERE status != 'done';
