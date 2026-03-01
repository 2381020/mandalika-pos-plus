import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  cacheMenuItems,
  getCachedMenuItems,
  cacheCategories,
  getCachedCategories,
} from "@/lib/offlineDb";

export function useMenuItems() {
  const isOnline = useOnlineStatus();

  const query = useQuery({
    queryKey: ["menu-items", isOnline],
    queryFn: async () => {
      if (isOnline) {
        const { data } = await supabase
          .from("menu_items")
          .select("*, menu_categories(name)")
          .eq("is_active", true)
          .order("name");
        const items = data ?? [];
        // Cache for offline use
        cacheMenuItems(items).catch(() => {});
        return items;
      }
      // Offline: read from IndexedDB
      return getCachedMenuItems();
    },
  });

  return query;
}

export function useCategories() {
  const isOnline = useOnlineStatus();

  const query = useQuery({
    queryKey: ["categories", isOnline],
    queryFn: async () => {
      if (isOnline) {
        const { data } = await supabase
          .from("menu_categories")
          .select("*")
          .order("sort_order");
        const cats = data ?? [];
        cacheCategories(cats).catch(() => {});
        return cats;
      }
      return getCachedCategories();
    },
  });

  return query;
}
