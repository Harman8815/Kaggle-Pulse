"use client";

import type { SpecializationFingerprintResult } from "../../../lib/analytics/specialization.types";
import { SpecializationFingerprintCard } from "./SpecializationFingerprintCard";
import { TopicDistribution } from "./TopicDistribution";
import { TopSpecializations } from "./TopSpecializations";
import { SpecializationBreakdown } from "./SpecializationBreakdown";

export const SpecializationPanel = ({ result }: { result: SpecializationFingerprintResult }) => (
  <section className="panel rhythm-panel specialization-panel">
    <SpecializationFingerprintCard classification={result.classification} />
    <TopicDistribution topics={result.topics} />
    <TopSpecializations topics={result.topics} />
    <SpecializationBreakdown result={result} />
  </section>
);
