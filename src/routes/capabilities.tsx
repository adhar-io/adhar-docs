import { createFileRoute } from "@tanstack/react-router";
import Capabilities from "@/pages/Capabilities";

export const Route = createFileRoute("/capabilities")({
  component: Capabilities,
});
