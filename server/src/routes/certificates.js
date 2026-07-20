import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/requireAuth.js';
import { listCertificates, addCertificate, getCertificateFile, deleteCertificate, verifyCertificate } from '../services/certificateService.js';

export const certificatesRouter = Router();

const ALLOWED = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(Object.assign(new Error('Only PDF, PNG or JPG files are allowed.'), { status: 400 }));
  },
});

// GET /api/certificates - the user's vault.
certificatesRouter.get('/certificates', requireAuth, (req, res) => {
  res.json({ certificates: listCertificates(req.user.id) });
});

// POST /api/certificates - add a credential (optional file). Row committed only on success.
certificatesRouter.post('/certificates', requireAuth, (req, res) => {
  upload.single('file')(req, res, (uploadErr) => {
    if (uploadErr) {
      const status = uploadErr.code === 'LIMIT_FILE_SIZE' ? 400 : (uploadErr.status || 400);
      const msg = uploadErr.code === 'LIMIT_FILE_SIZE' ? 'File must be 5 MB or smaller.' : uploadErr.message;
      return res.status(status).json({ error: msg });
    }
    try {
      const cert = addCertificate(req.user.id, req.body, req.file);
      res.status(201).json({ certificate: cert, certificates: listCertificates(req.user.id) });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || 'Could not save certificate.' });
    }
  });
});

// GET /api/certificates/:id/file - download the stored file (owner only).
certificatesRouter.get('/certificates/:id/file', requireAuth, (req, res) => {
  try {
    const { path, downloadName } = getCertificateFile(req.user.id, req.params.id);
    res.download(path, downloadName);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not fetch file.' });
  }
});

// DELETE /api/certificates/:id
certificatesRouter.delete('/certificates/:id', requireAuth, (req, res) => {
  try {
    deleteCertificate(req.user.id, req.params.id);
    res.json({ certificates: listCertificates(req.user.id) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not delete certificate.' });
  }
});

// POST /api/certificates/:id/verify  { url }  - verify via an Open Badge assertion URL.
certificatesRouter.post('/certificates/:id/verify', requireAuth, async (req, res) => {
  try {
    const certificate = await verifyCertificate(req.user.id, req.params.id, req.body?.url);
    res.json({ certificate, certificates: listCertificates(req.user.id) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not verify certificate.' });
  }
});
