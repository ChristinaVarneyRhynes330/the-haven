import { useState } from "react";
import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { ArrowRight, GripVertical, Layers, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import { Surface } from "@/components/shared/Surface";
import { AreaIcon } from "@/components/shared/AreaIcon";
import { LifeAreaSheet } from "@/components/life-areas/LifeAreaSheet";
import { useCollection } from "@/lib/data";
import { areaDot, areaSoft } from "@/lib/design";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/life-areas")({
  head: () => ({ meta: [{ title: "Life areas · LifeOS" }] }),
  component: LifeAreasPage,
});

function LifeAreasPage() {
  const { items: areas, loading, reload } = useCollection(
    "LifeArea",
    { archived: { $ne: true } },
    { sort: "order", limit: 100 }
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const matchRoute = useMatchRoute();
  const isDetail = !!matchRoute({ to: "/life-areas/$areaId" });

  const move = async (area, direction) => {
    const sorted = [...areas].sort((a, b) => (a.order || 0) - (b.order || 0));
    const index = sorted.findIndex((a) => a.id === area.id);
    const swapWith = sorted[index + direction];
    if (!swapWith) return;
    await base44.entities.LifeArea.update(area.id, { order: index + direction });
    await base44.entities.LifeArea.update(swapWith.id, { order: index });
    reload();
  };

  if (isDetail) return <Outlet />;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="The shape of your life"
        title="Life areas"
        description="Every task, appointment and note can belong to one. They're how the pieces connect."
        actions={
          <Button
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New area
          </Button>
        }
      />

      {loading ? <LoadingBlock rows={4} /> : null}

      {!loading && !areas.length ? (
        <EmptyState
          icon={Layers}
          title="No areas yet"
          description="Most people start with three or four: you, home, work, health. You can rename them any time."
          action={
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setEditing(null);
                setSheetOpen(true);
              }}
            >
              Add your first area
            </Button>
          }
        />
      ) : null}

      <div className="space-y-2">
        {areas.map((area, index) => (
          <Surface
            key={area.id}
            className={cn("flex items-center gap-3 p-3.5", area.hidden && "opacity-60")}
          >
            <span
              className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", areaSoft(area.tone))}
            >
              <AreaIcon name={area.icon} className="h-4.5 w-4.5" />
            </span>
            <Link
              to="/life-areas/$areaId"
              params={{ areaId: area.id }}
              className="min-w-0 flex-1"
            >
              <p className="flex items-center gap-2 text-sm font-medium">
                {area.name}
                {area.hidden ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                    Hidden
                  </span>
                ) : null}
              </p>
              {area.description ? (
                <p className="truncate text-xs text-muted-foreground">{area.description}</p>
              ) : null}
            </Link>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label={`Move ${area.name} up`}
                disabled={index === 0}
                onClick={() => move(area, -1)}
              >
                <GripVertical className="h-4 w-4 rotate-90" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label={`Move ${area.name} down`}
                disabled={index === areas.length - 1}
                onClick={() => move(area, 1)}
              >
                <GripVertical className="h-4 w-4 -rotate-90" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label={`Edit ${area.name}`}
                onClick={() => {
                  setEditing(area);
                  setSheetOpen(true);
                }}
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </Surface>
        ))}
      </div>

      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        Hidden areas keep their history — they just stop appearing in lists. Archived areas can be
        restored from here too.
      </p>

      <LifeAreaSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        area={editing}
        onSaved={reload}
      />
    </div>
  );
}