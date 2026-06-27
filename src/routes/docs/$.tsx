import { createFileRoute } from "@tanstack/react-router";
import Documentation from "@/pages/Documentation";

export const Route = createFileRoute("/docs/$")({
  component: Documentation,
});
