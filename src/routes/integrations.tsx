import { createFileRoute } from "@tanstack/react-router";
import Integrations from "@/pages/Integrations";

export const Route = createFileRoute("/integrations")({
  component: Integrations,
});
