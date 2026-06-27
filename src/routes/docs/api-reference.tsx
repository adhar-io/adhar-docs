import { createFileRoute } from "@tanstack/react-router";
import ApiReference from "@/pages/ApiReference";

export const Route = createFileRoute("/docs/api-reference")({
  component: ApiReference,
});
