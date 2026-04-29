# Presentations

Generated slide decks for stakeholder updates.

| File | Audience | Purpose |
|---|---|---|
| `bod-update-2026-04.pptx` | Ban Giám đốc (BOD) + Tập đoàn | Tháng 4/2026 progress update — backend foundation done, IT collab needed, early demo promise |

## Workflow

Decks are code-generated for repeatability and versioning:

- Source: `app/scripts/build-bod-update-slides.mjs`
- Generator: [`pptxgenjs`](https://gitbrent.github.io/PptxGenJS/) (devDep)
- Theme: Mắt Việt navy `#13245C` + yellow `#FFC107`; embeds `app/public/brand/MV6.png` (on-dark) and `MV2.png` (on-light)

## Regenerate

```bash
cd app
npm run docs:bod-update
```

Output is committed alongside the source so reviewers see the rendered deck without running Node.

## Adding a new deck

1. Copy `build-bod-update-slides.mjs` → `build-<topic>-slides.mjs`
2. Edit slide content (the file is flat — one block per slide)
3. Add an npm script in `app/package.json`: `"docs:<topic>": "node scripts/build-<topic>-slides.mjs"`
4. Commit both source and generated `.pptx`
