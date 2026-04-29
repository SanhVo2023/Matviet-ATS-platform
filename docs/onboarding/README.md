# Onboarding documents

Forms and intake docs we send to non-technical stakeholders to capture data the app needs.

| File | For | Status |
|---|---|---|
| `hr-prefill-form.vi.docx` | chị Hương (HR Staff) — fill once during initial setup | Active |
| `hr-prefill-form.vi.md` | Markdown source of truth for the docx — edit here, then regen | Source |

## Workflow

1. **Send the `.docx`** to the recipient (email or printed). They edit in Word and email back.
2. Sanh transcribes their answers into the app via:
   - Settings → Users (HR + Hiring Managers)
   - Job creation forms (JD content + role family + weights)
   - Settings → Email Templates (custom template overrides)
3. Update the markdown source if questions need to change, then regenerate the `.docx`:
   ```bash
   cd app && npm run docs:hr-prefill
   ```

The generator script lives at `app/scripts/build-hr-prefill-docx.mjs` and uses the `docx` package (devDep). Output is committed alongside the source so reviewers can read the rendered form without running Node.
