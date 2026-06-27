import { createFileRoute } from "@tanstack/react-router";
import ArchitectureShowcase from "@/pages/ArchitectureShowcase";

export const Route = createFileRoute("/architecture-showcase")({
  component: ArchitectureShowcase,
});
