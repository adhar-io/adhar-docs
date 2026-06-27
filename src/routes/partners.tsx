import { createFileRoute } from "@tanstack/react-router";
import Partners from "@/pages/Partners";

export const Route = createFileRoute("/partners")({
  component: Partners,
});
