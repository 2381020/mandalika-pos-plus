import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import KasirDashboard from "./pages/kasir/KasirDashboard";
import Transaksi from "./pages/kasir/Transaksi";
import Sinkronisasi from "./pages/kasir/Sinkronisasi";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import ManajemenMenu from "./pages/owner/ManajemenMenu";
import Pesan from "./pages/customer/Pesan";
import Katalog from "./pages/katalog/Katalog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/katalog" element={<Katalog />} />
            <Route path="/pesan" element={<ProtectedRoute allowedRoles={["customer", "kasir", "owner", "admin"]}><Pesan /></ProtectedRoute>} />
            <Route path="/kasir" element={<ProtectedRoute allowedRoles={["kasir", "admin"]}><KasirDashboard /></ProtectedRoute>} />
            <Route path="/kasir/transaksi" element={<ProtectedRoute allowedRoles={["kasir", "admin"]}><Transaksi /></ProtectedRoute>} />
            <Route path="/kasir/sinkronisasi" element={<ProtectedRoute allowedRoles={["kasir", "admin"]}><Sinkronisasi /></ProtectedRoute>} />
            <Route path="/owner" element={<ProtectedRoute allowedRoles={["owner", "admin"]}><OwnerDashboard /></ProtectedRoute>} />
            <Route path="/owner/menu" element={<ProtectedRoute allowedRoles={["owner", "admin"]}><ManajemenMenu /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
