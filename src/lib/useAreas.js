import { useMemo } from "react";
import { useCollection } from "./data";

/** Life areas with a lookup map, used by every screen that labels records. */
export function useAreas() {
  const { items, loading, reload, error } = useCollection(
    "LifeArea",
    { archived: { $ne: true } },
    { sort: "order", limit: 200 }
  );

  const byId = useMemo(() => {
    const map = {};
    items.forEach((area) => {
      map[area.id] = area;
    });
    return map;
  }, [items]);

  return { areas: items, byId, loading, reload, error };
}