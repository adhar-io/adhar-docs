import { createFileRoute } from "@tanstack/react-router";
import Compliance from "@/pages/Compliance";

export const Route = createFileRoute("/compliance")({
  component: Compliance,
});
