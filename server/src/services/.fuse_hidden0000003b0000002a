// File storage behind a small interface so the Certificate Vault never depends on where
// bytes actually live. Local disk now; swap to a volume or blob store later by replacing
// this module — callers (certificateService) don't change.
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.STORAGE_DIR || join(here, '..', '..', 'storage', 'certificates');
mkdirSync(ROOT, { recursive: true });

export const storage = {
  // Save bytes, return an opaque ref (never a caller-supplied path — avoids traversal).
  save(buffer, originalName) {
    const ext = extname(originalName || '').slice(0, 10);
    const ref = `${randomUUID()}${ext}`;
    writeFileSync(join(ROOT, ref), buffer);
    return ref;
  },
  // Resolve a ref to an absolute path, guarding against path traversal.
  absolutePath(ref) {
    if (!ref) return null;
    const safe = basename(ref); // strip any directory components
    const p = join(ROOT, safe);
    return existsSync(p) ? p : null;
  },
  remove(ref) {
    if (!ref) return;
    const p = join(ROOT, basename(ref));
    if (existsSync(p)) rmSync(p);
  },
};
