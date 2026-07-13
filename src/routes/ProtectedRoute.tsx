import { Navigate, useLocation } from "react-router-dom";
import { Spinner } from "@fluentui/react-components";
import { useAuth } from "@/providers/AuthProvider";
import type { ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div style={{ height: "100dvh", display: "grid", placeItems: "center" }}>
        <Spinner label="Loading…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
