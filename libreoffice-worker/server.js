/**
 * Mắt Việt HR — LibreOffice DOCX → PDF worker.
 *
 * POST /convert
 *   Headers: Authorization: Bearer ${WORKER_SECRET}
 *   Body: multipart form-data, single file field "file" (.doc / .docx)
 *   Response: application/pdf bytes
 *
 * Usage from the score-candidate Edge Function (when LIBREOFFICE_WORKER_URL
 * is set as an Edge Function secret): fetch the bytes, POST to /convert,
 * upload the resulting PDF to Storage at `${candidate_id}/converted.pdf`,
 * then update cv_files.pdf_storage_path.
 *
 * Health: GET /health → "ok".
 */

const express = require("express");
const multer = require("multer");
const { execFile } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");

const PORT = parseInt(process.env.PORT || "8080", 10);
const WORKER_SECRET = process.env.WORKER_SECRET;
const MAX_BYTES = 10 * 1024 * 1024;

if (!WORKER_SECRET) {
  console.error("[worker] WORKER_SECRET not set; refusing to start");
  process.exit(1);
}

const app = express();
const upload = multer({ limits: { fileSize: MAX_BYTES } });

app.get("/health", (_req, res) => res.send("ok"));

app.post("/convert", upload.single("file"), async (req, res) => {
  // Constant-time-ish bearer check
  const auth = req.headers.authorization || "";
  const expected = `Bearer ${WORKER_SECRET}`;
  if (!safeEqual(auth, expected)) return res.status(401).json({ error: "Unauthorized" });
  if (!req.file) return res.status(400).json({ error: "No file" });

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "mv-libo-"));
  const inExt = (path.extname(req.file.originalname) || ".docx").toLowerCase();
  const inPath = path.join(tmp, `in${inExt}`);
  try {
    await fs.writeFile(inPath, req.file.buffer);
    const pdfPath = await convertToPdf(inPath, tmp);
    const pdfBuf = await fs.readFile(pdfPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(pdfBuf.length));
    return res.end(pdfBuf);
  } catch (err) {
    console.error("[convert] failed:", err);
    return res.status(500).json({ error: err && err.message ? err.message : "Conversion failed" });
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
});

function convertToPdf(inputPath, outDir) {
  return new Promise((resolve, reject) => {
    execFile(
      "libreoffice",
      ["--headless", "--convert-to", "pdf", "--outdir", outDir, inputPath],
      { timeout: 60_000 },
      async (err) => {
        if (err) return reject(err);
        const expected = path.join(outDir, path.basename(inputPath, path.extname(inputPath)) + ".pdf");
        try {
          await fs.access(expected);
          resolve(expected);
        } catch {
          reject(new Error("LibreOffice did not produce a PDF"));
        }
      },
    );
  });
}

function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

app.listen(PORT, () => console.log(`[worker] listening on ${PORT}`));
