CREATE TABLE notes (
    id           TEXT PRIMARY KEY,
    body         TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    -- set once the note went through the AI and landed in the inbox
    processed_at TEXT,
    item_count   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX notes_updated ON notes (updated_at DESC);
