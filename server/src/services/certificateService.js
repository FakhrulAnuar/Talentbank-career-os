// Certificate Vault logic. A certificate row is only written after its file (if any) is
// stored, so the client never shows a credential the server hasn't durably accepted.
import { extname } from 'node:path';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { certificates } from '../db/schema.js';
import { storage } from './storageService.js';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg']);

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function shape(c) {
  return {
    id: c.id,
    title: c.title,
    issuer: c.issuer,
    issuedAt: c.issuedAt,
    hasFile: Boolean(c.fileRef),
    isImage: c.fileRef ? IMAGE_EXT.has(extname(c.fileRef).toLowerCase()) : false,
  };
}

export function listCertificates(userId) {
  return db.select().from(certificates)
    .where(eq(certificates.userId, userId))
    .orderBy(desc(certificates.issuedAt))
    .all()
    .map(shape);
}

// file is an optional { buffer, originalname }. Stored first, row committed second.
export function addCertificate(userId, { title, issuer, issuedAt }, file) {
  if (!title || !title.trim()) throw httpError(400, 'Title is required.');
  if (!issuer || !issuer.trim()) throw httpError(400, 'Issuer is required.');

  let fileRef = null;
  if (file && file.buffer) fileRef = storage.save(file.buffer, file.originalname);

  try {
    const row = db.insert(certificates).values({
      userId,
      milestoneId: null,
      title: title.trim(),
      issuer: issuer.trim(),
      fileRef,
      issuedAt: issuedAt ? Number(issuedAt) : Date.now(),
    }).returning().get();
    return shape(row);
  } catch (err) {
    if (fileRef) storage.remove(fileRef); // don't orphan a file if the row failed
    throw err;
  }
}

export function getCertificateFile(userId, id) {
  const cert = db.select().from(certificates)
    .where(and(eq(certificates.id, Number(id)), eq(certificates.userId, userId)))
    .get();
  if (!cert) throw httpError(404, 'Certificate not found.');
  if (!cert.fileRef) throw httpError(404, 'No file attached to this certificate.');
  const path = storage.absolutePath(cert.fileRef);
  if (!path) throw httpError(410, 'File is no longer available.');
  return { path, downloadName: `${cert.title}`.replace(/[^\w.-]+/g, '_') };
}

export function deleteCertificate(userId, id) {
  const cert = db.select().from(certificates)
    .where(and(eq(certificates.id, Number(id)), eq(certificates.userId, userId)))
    .get();
  if (!cert) throw httpError(404, 'Certificate not found.');
  db.delete(certificates).where(eq(certificates.id, cert.id)).run();
  if (cert.fileRef) storage.remove(cert.fileRef);
  return { id: cert.id };
}

// Each stored certificate contributes a flat bonus to the Pathway Score.
export const POINTS_PER_CERTIFICATE = 10;
export function certificateCount(userId) {
  return db.select({ id: certificates.id }).from(certificates)
    .where(eq(certificates.userId, userId)).all().length;
}
