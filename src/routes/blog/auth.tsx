import { createFileRoute } from "@tanstack/react-router";
import BlogAuth from "@/pages/BlogAuth";

export const Route = createFileRoute("/blog/auth")({
  component: BlogAuth,
});
