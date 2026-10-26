import type { ComponentType } from "react";
import { PLATFORM_DIAGRAMS } from "./platform";
import { core_concepts } from "./core-concepts";
import { kit } from "./kit";
import { guides } from "./guides";
import { providers } from "./providers";
import { howto_a } from "./howto-a";
import { howto_b } from "./howto-b";
import { deep_start } from "./deep-start";
import { deep_providers } from "./deep-providers";
import { deep_ops } from "./deep-ops";
import { functions } from "./functions";

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
  ...howto_a,
  ...howto_b,
  ...deep_start,
  ...deep_providers,
  ...deep_ops,
  ...functions,
};
