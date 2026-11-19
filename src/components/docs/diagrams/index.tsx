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
import { rw_start } from "./rw-start";
import { rw_concepts } from "./rw-concepts";
import { rw_serverless } from "./rw-serverless";
import { rw_guides_a } from "./rw-guides-a";
import { rw_guides_b } from "./rw-guides-b";
import { rw_ops } from "./rw-ops";
import { rw_providers_a } from "./rw-providers-a";
import { rw_providers_b } from "./rw-providers-b";
import { rw_pe } from "./rw-pe";
import { rw_kit_a } from "./rw-kit-a";
import { rw_kit_b } from "./rw-kit-b";
import { rw_kit_c } from "./rw-kit-c";

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
  ...rw_start,
  ...rw_concepts,
  ...rw_serverless,
  ...rw_guides_a,
  ...rw_guides_b,
  ...rw_ops,
  ...rw_providers_a,
  ...rw_providers_b,
  ...rw_pe,
  ...rw_kit_a,
  ...rw_kit_b,
  ...rw_kit_c,
};
