-- First-pass reading of a note, kept until the user finishes the wizard.
CREATE TABLE note_drafts (
    note_id    TEXT PRIMARY KEY,
    draft      TEXT NOT NULL,
    created_at TEXT NOT NULL
);
