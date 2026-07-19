// Data-layer interface for the Ascent Path. Callers (routes) never touch SQL directly,
// so the storage engine can change without rewriting the API. Pathway Score is derived here:
// completed milestone points + completed module points + a bonus per stored certificate.
import { eq, asc, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, milestones, userProgress, certificates } from '../db/schema.js';
import { completedModulePoints } from '../services/moduleService.js';
import { POINTS_PER_CERTIFICATE } from '../services/certificateService.js';
import { topRecommendations } from '../services/recommendationService.js';

export const journeyRepo = {
  getJourney(userId) {
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) return null;

    // Single indexed join: milestones for this path + this user's progress (no N+1).
    const path = db
      .select({
        key: milestones.key,
        orderIndex: milestones.orderIndex,
        phase: milestones.phase,
        title: milestones.title,
        kind: milestones.kind,
        points: milestones.points,
        status: userProgress.status,
        pointsAwarded: userProgress.pointsAwarded,
        completedAt: userProgress.completedAt,
      })
      .from(milestones)
      .innerJoin(
        userProgress,
        and(eq(userProgress.milestoneId, milestones.id), eq(userProgress.userId, userId))
      )
      .where(eq(milestones.pathType, user.pathType))
      .orderBy(asc(milestones.orderIndex))
      .all();

    const certs = db
      .select({
        id: certificates.id,
        title: certificates.title,
        issuer: certificates.issuer,
        issuedAt: certificates.issuedAt,
        milestoneKey: milestones.key,
      })
      .from(certificates)
      .leftJoin(milestones, eq(certificates.milestoneId, milestones.id))
      .where(eq(certificates.userId, userId))
      .all();

    // Derived score — never stored, can't drift. Milestones + modules + certificate bonus.
    const milestonePoints = path.reduce((sum, m) => sum + (m.status === 'completed' ? m.pointsAwarded : 0), 0);
    const score = milestonePoints + completedModulePoints(userId) + certs.length * POINTS_PER_CERTIFICATE;

    // Live-matched targets for the summit preview (replaces any static seed).
    const recommendations = topRecommendations(userId, user.pathType, 3);

    return {
      user: { id: user.id, displayName: user.displayName, pathType: user.pathType },
      score,
      path,
      certificates: certs.map((c) => ({ id: c.id, title: c.title, issuer: c.issuer, milestoneKey: c.milestoneKey, issuedAt: c.issuedAt })),
      recommendations,
    };
  },
};
