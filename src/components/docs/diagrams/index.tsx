import type { ComponentType } from "react";
import { PLATFORM_DIAGRAMS } from "./platform";
import { core_concepts } from "./core-concepts";
import { kit } from "./kit";
import { guides } from "./guides";
import { providers } from "./providers";

/**
 * Every docs diagram, keyed by the name a ```diagram fence uses.
 * Groups live in sibling files so they can be edited independently.
 */
export const DIAGRAMS: Record<string, ComponentType> = {
  ...PLATFORM_DIAGRAMS,
  ...core_concepts,
  ...kit,
  ...guides,
  ...providers,
};
