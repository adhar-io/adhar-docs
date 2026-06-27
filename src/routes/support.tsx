import { createFileRoute } from "@tanstack/react-router";
import Support from "@/pages/Support";

export const Route = createFileRoute("/support")({
  component: Support,
});
