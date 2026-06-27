import { createFileRoute } from "@tanstack/react-router";
import AdharKit from "@/pages/AdharKit";

export const Route = createFileRoute("/adhar-kit/")({
  component: AdharKit,
});
