# Mắt Việt HR — LibreOffice DOCX→PDF worker

Tiny stateless service that wraps `libreoffice --headless --convert-to pdf` behind an HTTP endpoint. Used by the `score-candidate` Supabase Edge Function when a candidate uploads a DOCX (PDF parsing requires PDF input).

**Status:** scaffolding only. **Not deployed yet.** Until Sanh runs `fly deploy`, DOCX uploads land in the manual-scoring fallback (the candidate's "Phân tích AI" tab shows a clear banner + slider form).

## What it does

- `POST /convert` — multipart `file` field; returns PDF bytes. Bearer-token auth via `WORKER_SECRET`.
- `GET /health` — uptime check used by Fly's HTTP healthchecks.

10 MB max upload, 60s conversion timeout, runs as non-root user.

## Deploying (Sanh, one-time)

Prerequisites: Fly.io account + `fly` CLI installed locally.

```bash
cd libreoffice-worker

# 1. Provision the Fly app (skip the prompt to deploy immediately).
fly launch --no-deploy --copy-config --name matviet-libreoffice

# 2. Set the shared secret used to authenticate inbound calls from
#    the score-candidate Edge Function.
fly secrets set WORKER_SECRET="$(openssl rand -hex 32)"

# 3. Deploy.
fly deploy

# 4. Note the URL Fly gives you (typically https://matviet-libreoffice.fly.dev).
fly status
```

Then in the **Supabase dashboard → Edge Functions → score-candidate → Secrets**, add:

```
LIBREOFFICE_WORKER_URL=https://matviet-libreoffice.fly.dev
LIBREOFFICE_WORKER_SECRET=<the same WORKER_SECRET value>
```

Re-deploy `score-candidate` (or wait for the next deploy) and DOCX uploads will start auto-converting.

## Why Fly.io and not Netlify

Netlify Functions don't ship LibreOffice (debian package, ~600 MB on disk + needs writable FS for tmp). Fly.io runs full Docker containers; this image is the smallest viable host for headless LibreOffice.

## Costs

`shared-cpu-1x` 512 MB with `auto_stop_machines = "stop"` → free tier-friendly. At our 50 CVs/month volume the machine stays cold most of the day; Fly only bills running compute.

## Updating the worker

```bash
cd libreoffice-worker
fly deploy
```

No persistent state, so deploys are zero-downtime.

## Local testing

```bash
docker build -t matviet-libo .
docker run --rm -p 8080:8080 -e WORKER_SECRET=test matviet-libo

curl -X POST http://localhost:8080/convert \
  -H "Authorization: Bearer test" \
  -F "file=@sample.docx" \
  --output out.pdf
```
