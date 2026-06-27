import { createFileRoute } from "@tanstack/react-router";
import Examples from "@/pages/Examples";

export const Route = createFileRoute("/examples")({
  component: Examples,
});
