import { useAuth } from "@/hooks/useAuth";
import { OnlineStatusBadge } from "@/components/OnlineStatusBadge";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  RefreshCw,
  BarChart3,
  UtensilsCrossed,
  LogOut,
  Receipt,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const kasirLinks = [
  { to: "/kasir", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/kasir/transaksi", icon: ShoppingCart, label: "Transaksi Baru" },
  { to: "/kasir/sinkronisasi", icon: RefreshCw, label: "Sinkronisasi" },
  { to: "/riwayat", icon: Receipt, label: "Transaksi" },
];

const ownerLinks = [
  { to: "/owner", icon: BarChart3, label: "Dashboard" },
  { to: "/owner/menu", icon: UtensilsCrossed, label: "Manajemen Menu" },
  { to: "/owner/export", icon: FileDown, label: "Export Laporan" },
];

const linkClass = (active: boolean) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    active
      ? "bg-sidebar-accent text-sidebar-primary"
      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
  }`;

export function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const { role, signOut, user } = useAuth();
  const location = useLocation();
  const links = role === "owner" || role === "admin" ? ownerLinks : kasirLinks;

  return (
    <>
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-lg">
          M
        </div>
        <div>
          <h1 className="font-bold text-sm">Mandalika</h1>
          <p className="text-xs text-sidebar-foreground/60 capitalize">{role ?? "—"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={linkClass(active)}
              onClick={onLinkClick}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-3">
        <OnlineStatusBadge />
        <div className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </Button>
      </div>
    </>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden md:flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground shrink-0">
      <SidebarContent />
    </aside>
  );
}
