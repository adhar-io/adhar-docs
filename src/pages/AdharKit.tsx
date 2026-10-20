import DocsShell from "@/components/docs/DocsShell";
import { buildRegistry } from "@/lib/docsRegistry";
import { KIT_VERSIONS } from "@/lib/docsVersions";

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


const AdharKit = () => (
  <DocsShell
    registry={registry}
    versionSource={KIT_VERSIONS}
    searchLabel="the Adhar Kit docs"
    brand={{
      title: "Adhar Kit",
      subtitle: "Java toolkit",
      homeHref: "/adhar-kit",
    }}
  />
);

export default AdharKit;
