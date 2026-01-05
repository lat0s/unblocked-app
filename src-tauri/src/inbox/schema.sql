CREATE TABLE inbox_items (
    id         TEXT PRIMARY KEY,
    note_id    TEXT,
    -- the AI's proposal as JSON (see inbox::Proposal); editable until decided
    data       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
    target_id  TEXT,
    created_at TEXT NOT NULL,
    decided_at TEXT
);
CREATE INDEX inbox_pending ON inbox_items (status, created_at);
