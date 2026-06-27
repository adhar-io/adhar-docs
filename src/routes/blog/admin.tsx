import { createFileRoute } from "@tanstack/react-router";
import RequireAuth from "@/components/blog/RequireAuth";
import BlogAdmin from "@/pages/BlogAdmin";

export const Route = createFileRoute("/blog/admin")({
  component: () => (
    <RequireAuth>
      <BlogAdmin />
    </RequireAuth>
  ),
});
