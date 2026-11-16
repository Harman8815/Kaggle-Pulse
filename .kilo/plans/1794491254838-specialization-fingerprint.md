# Stage 3 — Specialization Fingerprint (implementation plan)

## Goal & scope
- Determine what technical domains a Kaggle user actually works on (topic intelligence), per `docs/task.md` §6.
- **In scope:** rule-based topic extraction from notebook/dataset/competition metadata, topic taxonomy, specialization scoring, user classification (Specialist/Generalist/Multi-domain/Emerging/Exploratory), data-coverage reporting, UI panel(s) wired into `Dashboard.tsx`, reproducible rule-based model (no ML/NLP embeddings in v1).
- **Out of scope:** NLP/text embeddings and semantic matching (deferred per spec §6.2C "then introduce NLP"); cohort/community baselines; historical topic evolution beyond per-item dates; changes to Stage 0/1/2 behavior beyond consuming existing outputs.

## Source of truth & constraints
- Spec: `docs/task.md` §6.1–6.3; global rules §2 (API/Derived/Snapshot; zero vs unavailable; no estimates presented as official).
- Data today (`docs/availability-report.md` lines 13–14): notebook/dataset **tags are NOT exposed**. `KaggleActivity` exposes `title`, `description?`, `language?`, and opaque `metadata?: Record<string, unknown>` but **no `tags` field**. Stats counts (notebooks/datasets/models/competitions/discussions) available; models/competitions/discussions hardcoded 0 / blocked.
- Reuse patterns from Stage 1/2: `app/lib/analytics/consistency*.ts` (pure analytics + `.types.ts`), `app/components/dashboard/consistency/*` and `archetype/*` (panel conventions), `dateKey`/helpers in `app/components/dashboard/utils.ts`, `globals.css` panel/badge/track patterns.
- Do not add dependencies; do not touch pre-existing lint/type errors outside new Stage 3 files; analytics independent of UI.

## Resolved design decisions
1. **Data source (confirmed):** v1 fingerprint built from `title` + `description` + `language` via rule-based keyword/taxonomy matching. Tag-based matching marked `needs_collection` (tags not exposed today; future tags endpoint could enable it). Do not infer tags from `metadata` without a documented contract.
2. **Topic taxonomy (v1, controlled):** 9 primary domains with subtopics from spec §6.2A (Machine Learning, Deep Learning, Computer Vision, NLP, Data Science, Time Series, Tabular AI, Reinforcement Learning, Data Engineering). Each domain owns a keyword/tag map; ambiguous/unknown items go to "Unclassified" — never forced.
3. **Metadata processing:** clean titles/descriptions (trim, lowercase, dedupe), drop generic stop-words, combine title+description+language into a searchable blob per activity, preserve original metadata for traceability, handle multiple topics per item.
4. **Scoring:** topic frequency per domain, weighted by contribution type (notebook vs dataset vs competition), normalized to 0–1 shares; reduce duplicate/near-duplicate influence (dedupe by title); identify primary/secondary specializations and breadth. No count presented as "expertise."
5. **Classification (v1):** Specialist (one domain dominates), Generalist (spread, no dominant), Multi-domain Practitioner (2+ significant), Emerging Specialist (few items, one domain), Exploratory/Drifting (broad, shallow). Confidence high|medium|low|insufficient from data sufficiency (min items thresholds, documented constants). Every label carries explanation citing counts/shares/missing data.
6. **Data coverage:** per-domain availability, missing fields, `incomplete: boolean`. Blocked/unavailable domains reported separately, never as zero contribution.
7. **UI placement:** collapsible "Specialization fingerprint" panel below "Contribution archetype" (Stage 2) and above `VisualizationGrid`; includes fingerprint card, topic distribution, top-5 specializations, classification + confidence, coverage note; peer-baseline area shows unavailable message.
8. **Styles:** append specialization classes to `app/globals.css` reusing panel/badge/track patterns (no new deps).

## Affected boundaries & data flow
- `app/utils/api.ts` (read-only consumer contract: `KaggleActivity[]`) → `Dashboard.tsx` → `buildSpecializationFingerprint(activities)` (pure) → specialization UI components. Analytics remain UI-independent for reuse in future atlas/comparison modules.

## Risks & mitigations
- **Tags unavailable:** fingerprint relies on title/description keyword matching; less precise than tag matching. Mitigation: explicit `needs_collection` flag for tags, clear copy, no overclaimed precision.
- **Sparse/short metadata:** titles may lack domain signals. Mitigation: low/insufficient confidence, "Unclassified" bucket, explicit coverage.
- **Duplicate/near-duplicate notebooks inflating a domain:** Mitigation: dedupe by normalized title before counting.

## Ordered task list (for implementation agent)
1. **Types** — `app/lib/analytics/specialization.types.ts`: `TopicDomain`, `TopicMatch`, `SpecializationScore`, `FingerprintClassification`, `SpecializationFingerprintResult`, `FingerprintDataCoverage`, domain/subtopic taxonomy constants, keyword maps.
2. **Analytics core** — `app/lib/analytics/specialization.ts`: `extractTopics(activities)`, `scoreTopics(...)`, `classifySpecialization(...)`, `buildSpecializationFingerprint(...)` single reproducible entry point; pure, no `Date.now()`.
3. **Rule documentation** — exported `SPECIALIZATION_MODEL_DOC` / inline constants stating keyword maps, weights, thresholds (min items for confidence tiers, dominance cutoff) so reasoning is auditable.
4. **Edge cases** — zero activities; all items unclassified; single-domain dominance; ties (deterministic); missing/undefined description/language; duplicate titles.
5. **UI components** — `app/components/dashboard/specialization/`: `SpecializationFingerprintCard`, `TopicDistribution`, `TopSpecializations`, `SpecializationBreakdown`, optional `SpecializationPanel` composer; confidence + incomplete badges; peer-baseline unavailable note.
6. **Dashboard wiring** — `Dashboard.tsx`: `useMemo(() => buildSpecializationFingerprint(activities), [activities])`; collapsible section below archetype, above `VisualizationGrid`; loading/empty states consistent with Stage 1/2.
7. **Styles** — append specialization classes to `app/globals.css` reusing existing patterns.
8. **Validation** — deterministic checks for fixtures: ml-heavy, spread/generalist, multi-domain, zero/empty, all-unclassified; same input ⇒ identical output; confidence gating correct.
9. **Quality gates** — `tsc --noEmit` and `npm run lint`; no new errors from Stage 3 files.

## Validation plan
- Deterministic unit-like checks over fixed fixtures.
- Cases: `{notebooks ML x8}`; spread across 5 domains; 2-domain multi-domain; zero items; all titles unclassified.
- `npx tsc --noEmit` and `npm run lint` report no new errors from Stage 3 files.

## Completion criteria
- System classifies profiles consistently, explains reasoning with counts/shares, avoids low-confidence-as-definitive, never presents blocked/tag data as zero, tsc+lint clean on new files.