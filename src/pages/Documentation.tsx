import DocsShell from "@/components/docs/DocsShell";
import { buildRegistry } from "@/lib/docsRegistry";
import { PLATFORM_VERSIONS } from "@/lib/docsVersions";

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


const Documentation = () => (
  <DocsShell
    registry={registry}
    versionSource={PLATFORM_VERSIONS}
    searchLabel="the Adhar docs"
    brand={{
      title: "Adhar Documentation",
      subtitle: "Platform reference",
      homeHref: "/docs",
    }}
  />
);

export default Documentation;
