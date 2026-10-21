import { createFileRoute } from "@tanstack/react-router";
import Brand from "@/pages/Brand";

export const Route = createFileRoute("/brand")({
  component: Brand,
});
