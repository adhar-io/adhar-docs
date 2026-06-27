import { createFileRoute } from "@tanstack/react-router";
import Architecture from "@/pages/Architecture";

export const Route = createFileRoute("/architecture")({
  component: Architecture,
});
