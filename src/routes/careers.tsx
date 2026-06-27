import { createFileRoute } from "@tanstack/react-router";
import Careers from "@/pages/Careers";

export const Route = createFileRoute("/careers")({
  component: Careers,
});
