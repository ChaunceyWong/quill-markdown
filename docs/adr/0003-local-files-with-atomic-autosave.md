# Local Markdown files with debounced atomic autosave

The File on disk is the only source of truth; there is no database and no cloud. Buffers are saved automatically after a short debounce, using a write-to-temporary-then-rename sequence so a crash cannot leave a truncated File. Cmd+S is kept as a force-save. Checklist state and other data that cannot live in Markdown are out of scope for M1.

Consequence: external edits to a File while it is open need a reload/conflict strategy, deferred to M2.
