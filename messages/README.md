# Translation status

`en.json` is the source of truth — every key here is authored copy, not translated.

`am.json` (Amharic) and `om.json` (Afaan Oromo) are **machine/AI-assisted draft
translations**, not reviewed by a native speaker. They cover only the strings
introduced by the RBAC PR (no-access page, registration's profile/success
steps, the grievance-detail message count) — the rest of the app has no
translation coverage yet and still renders hardcoded English regardless of
the selected locale.

Before these ship to real users: have a native Amharic and a native Afaan
Oromo speaker review `am.json` / `om.json` for accuracy, register (especially
around consent/legal language), and terminology consistency with whatever the
backend or other Ethiopian government services already use for this domain.
