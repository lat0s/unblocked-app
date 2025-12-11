CREATE TABLE events (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    notes        TEXT,
    kind         TEXT NOT NULL DEFAULT 'meeting' CHECK (kind IN ('meeting', 'time_block', 'reminder')),
    date         TEXT NOT NULL,
    start_time   TEXT,
    end_time     TEXT,
    deep_work    INTEGER NOT NULL DEFAULT 0,
    strategies   TEXT NOT NULL DEFAULT '[]',
    confidence   REAL,
    source_note  TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);
CREATE INDEX events_date ON events (date, start_time);
