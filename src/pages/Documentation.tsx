import DocsShell from "@/components/docs/DocsShell";
import { buildRegistry } from "@/lib/docsRegistry";
import type { DocsVersion } from "@/components/docs/DocsVersionSelector";

const modules = import.meta.glob("/src/content/docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const registry = buildRegistry({
  base: "/docs",
  contentRoot: "/src/content/docs",
  modules,
});

const versions: DocsVersion[] = [
  { value: "v2.1.0", label: "v2.1.0", channel: "stable", date: "May 2026" },
  { value: "v2.0.3", label: "v2.0.3", channel: "lts",    date: "Dec 2025" },
  { value: "v2.2.0-beta", label: "v2.2.0-beta", channel: "preview", date: "Apr 2026" },
  { value: "v1.9.1", label: "v1.9.1", channel: "legacy", date: "Jul 2025" },
];

const Documentation = () => (
  <DocsShell
    registry={registry}
    versions={versions}
    brand={{
      title: "Adhar Documentation",
      subtitle: "Platform reference",
      homeHref: "/docs",
    }}
  />
);

export default Documentation;
