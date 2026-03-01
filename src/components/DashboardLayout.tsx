import { useState } from "react";
import { AppSidebar, SidebarContent } from "@/components/AppSidebar";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ReactNode } from "react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />

      {/* Mobile header + hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen(true)}
          aria-label="Buka menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
          M
        </div>
        <span className="font-semibold text-sm">Mandalika</span>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-64 max-w-[85vw] p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
          <div className="flex h-full flex-col">
            <SidebarContent onLinkClick={() => setMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-y-auto bg-background pt-14 md:pt-0 p-4 sm:p-6 lg:p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
