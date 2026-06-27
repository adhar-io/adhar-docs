import { createFileRoute } from "@tanstack/react-router";
import RequireAuth from "@/components/blog/RequireAuth";
import BlogCompose from "@/pages/BlogCompose";

export const Route = createFileRoute("/blog/compose/")({
  component: () => (
    <RequireAuth>
      <BlogCompose />
    </RequireAuth>
  ),
});
