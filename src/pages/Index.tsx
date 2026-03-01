import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const Index = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/katalog" replace />;
  if (role === "customer") return <Navigate to="/katalog" replace />;
  if (role === "kasir") return <Navigate to="/kasir" replace />;
  return <Navigate to="/owner" replace />;
};

export default Index;
