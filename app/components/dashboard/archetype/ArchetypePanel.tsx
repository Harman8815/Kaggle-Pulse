"use client";

import type { ContributionArchetypeResult } from "../../../lib/analytics/archetype.types";
import { ArchetypeProfileCard } from "./ArchetypeProfileCard";
import { ContributionDistribution } from "./ContributionDistribution";
import { ArchetypeBreakdown } from "./ArchetypeBreakdown";

export const ArchetypePanel = ({ result }: { result: ContributionArchetypeResult }) => (
  <section className="panel rhythm-panel archetype-panel">
    <ArchetypeProfileCard classification={result.classification} />
    <ContributionDistribution distribution={result.distribution} />
    <ArchetypeBreakdown result={result} />
  </section>
);
