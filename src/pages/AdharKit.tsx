import DocsShell from "@/components/docs/DocsShell";
import { buildRegistry } from "@/lib/docsRegistry";
import type { DocsVersion } from "@/components/docs/DocsVersionSelector";

const modules = import.meta.glob("/src/content/adhar-kit/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const registry = buildRegistry({
  base: "/adhar-kit",
  contentRoot: "/src/content/adhar-kit",
  modules,
});

const versions: DocsVersion[] = [
  { value: "v1.4.0", label: "v1.4.0", channel: "stable", date: "May 2026" },
  { value: "v1.3.2", label: "v1.3.2", channel: "lts",    date: "Jan 2026" },
  { value: "v1.5.0-rc1", label: "v1.5.0-rc1", channel: "preview", date: "Apr 2026" },
  { value: "v1.2.7", label: "v1.2.7", channel: "legacy", date: "Aug 2025" },
  { value: "v1.0.9", label: "v1.0.9", channel: "legacy", date: "Feb 2025" },
];

const AdharKit = () => (
  <DocsShell
    registry={registry}
    versions={versions}
    brand={{
      title: "Adhar Kit",
      subtitle: "v1.4.0 · Java Toolkit",
      homeHref: "/adhar-kit",
    }}
  />
);

export default AdharKit;
