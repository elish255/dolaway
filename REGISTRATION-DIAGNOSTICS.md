# DOLAWAY registration diagnostics

Registration now logs the exact failing stage on the server without logging passwords or secret keys.

Search Vercel Runtime Logs for `[REGISTRATION]`. Expected stages:
- `start`
- `existing-check-db-error`
- `insert-db-error`
- `session-error-after-registration`
- `insert-ok`
- `session-ok`

The database error includes the HTTP status and Supabase/PostgREST response body. Do not paste secret keys into logs or chat.
