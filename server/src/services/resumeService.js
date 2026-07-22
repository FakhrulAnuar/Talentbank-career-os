// Resume assembler. Skills + certifications are auto-suggested from the user's ASCEND
// activity (completed modules, vault credentials); everything is editable and stored as a
// single JSON document, rendered as an ATS-friendly single-column CV on the client.
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, modules, userModules, certificates, resumes } from '../db/schema.js';

const str = (v, max = 400) => (typeof v === 'string' ? v.slice(0, max) : '');
const arrStr = (a, max = 40, itemMax = 300) =>
  Array.isArray(a) ? a.slice(0, max).map((s) => str(s, itemMax)).filter(Boolean) : [];

// What we can infer from the user's journey.
function suggestionsFor(userId) {
  const skills = db
    .select({ title: modules.title })
    .from(userModules)
    .innerJoin(modules, eq(userModules.moduleId, modules.id))
    .where(and(eq(userModules.userId, userId), eq(userModules.status, 'completed')))
    .all()
    .map((r) => r.title);

  const certifications = db
    .select({ title: certificates.title, issuer: certificates.issuer })
    .from(certificates)
    .where(eq(certificates.userId, userId))
    .orderBy(desc(certificates.issuedAt))
    .all()
    .map((c) => `${c.title} - ${c.issuer}`);

  return { skills, certifications };
}

function defaultDoc(user, suggestions) {
  return {
    fullName: user.displayName || '',
    headline: '',
    location: '',
    email: user.email || '',
    phone: '',
    links: '',
    summary: '',
    experience: [],   // { title, org, location, start, end, bullets: [] }
    education: [],     // { degree, school, location, graduated }
    skills: suggestions.skills,
    certifications: suggestions.certifications,
    references: [],    // { name, role, contact, note } - "Recommendations" (uni) / "Testimonies" (HS)
  };
}

function sanitize(data) {
  return {
    fullName: str(data.fullName, 120),
    headline: str(data.headline, 160),
    location: str(data.location, 120),
    email: str(data.email, 160),
    phone: str(data.phone, 60),
    links: str(data.links, 300),
    summary: str(data.summary, 1500),
    experience: (Array.isArray(data.experience) ? data.experience : []).slice(0, 20).map((e) => ({
      title: str(e.title, 160),
      org: str(e.org, 160),
      location: str(e.location, 120),
      start: str(e.start, 40),
      end: str(e.end, 40),
      bullets: arrStr(e.bullets, 15, 400),
    })),
    education: (Array.isArray(data.education) ? data.education : []).slice(0, 15).map((e) => ({
      degree: str(e.degree, 160),
      school: str(e.school, 160),
      location: str(e.location, 120),
      graduated: str(e.graduated, 60),
    })),
    skills: arrStr(data.skills, 60, 160),
    certifications: arrStr(data.certifications, 60, 200),
    references: (Array.isArray(data.references) ? data.references : []).slice(0, 10).map((r) => ({
      name: str(r.name, 120),
      role: str(r.role, 160),
      contact: str(r.contact, 160),
      note: str(r.note, 600),
    })),
  };
}

export function getResume(userId) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return null;
  const suggestions = suggestionsFor(userId);
  const stored = db.select().from(resumes).where(eq(resumes.userId, userId)).get();
  const resume = stored ? sanitize(JSON.parse(stored.data)) : defaultDoc(user, suggestions);
  return { resume, suggestions };
}

export function saveResume(userId, data) {
  const clean = sanitize(data || {});
  const now = Date.now();
  db.insert(resumes)
    .values({ userId, data: JSON.stringify(clean), updatedAt: now })
    .onConflictDoUpdate({ target: resumes.userId, set: { data: JSON.stringify(clean), updatedAt: now } })
    .run();
  return clean;
}
