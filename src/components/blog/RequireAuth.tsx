import { ReactNode } from "react";
import { Navigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import LoadingScreen from "@/components/LoadingScreen";

interface Props {
  children: ReactNode;
  /** When true, only moderators may access. */
  moderatorOnly?: boolean;
}

const RequireAuth = ({ children, moderatorOnly = false }: Props) => {
  const { isAuthenticated, isModerator, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/blog/auth" search={{ redirect: location.pathname }} replace />;
  }
  if (moderatorOnly && !isModerator) {
    return <Navigate to="/blog/admin" replace />;
  }
  return <>{children}</>;
};

export default RequireAuth;
