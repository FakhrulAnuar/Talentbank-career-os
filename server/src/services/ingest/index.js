// Orchestrates all step-2 ingestion. Called by a manual admin route and/or a scheduler.
import { ingestYouTubeCourses } from './youtube.js';
import { ingestAdzunaDemand } from './adzuna.js';

export async function runIngestion() {
  const startedAt = Date.now();
  const youtube = await ingestYouTubeCourses().catch((e) => ({ error: e.message }));
  const adzuna = await ingestAdzunaDemand().catch((e) => ({ error: e.message }));
  const summary = { youtube, adzuna, tookMs: Date.now() - startedAt };
  console.log('[ingest] run complete', JSON.stringify(summary));
  return summary;
}
