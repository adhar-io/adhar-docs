import { createFileRoute } from "@tanstack/react-router";
import Contributors from "@/pages/Contributors";

export const Route = createFileRoute("/contributors")({
  component: Contributors,
});
