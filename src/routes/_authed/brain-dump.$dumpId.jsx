import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Inbox, Sparkles, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PageHeader, BackLink } from "@/components/shared/PageHeader";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import { Surface } from "@/components/shared/Surface";
import { ProposalCard } from "@/components/shared/ProposalCard";
import { useRecord } from "@/lib/data";
import { useAreas } from "@/lib/useAreas";
import { approveProposal, ignoreProposal } from "@/lib/proposals";
import { fmtDate, fmtTime } from "@/lib/format";

export const Route = createFileRoute("/_authed/brain-dump/$dumpId")({
  head: () => ({ meta: [{ title: "Review · LifeOS" }] }),
  component: DumpReviewPage,
});

function DumpReviewPage() {
  const { dumpId } = Route.useParams();
  const navigate = useNavigate();
  const { record: dump, loading, reload } = useRecord("BrainDump", dumpId);
  const { byId, areas } = useAreas();
  const [proposals, setProposals] = useState([]);
  const [proposalsLoading, setProposalsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadProposals = useCallback(async () => {
    try {
      const result = await base44.entities.Proposal.filter(
        { dump_id: dumpId },
        { sort: "order_index", limit: 60 }
      );
      setProposals(Array.isArray(result) ? result : result?.items || []);
    } finally {
      setProposalsLoading(false);
    }
  }, [dumpId]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const pending = proposals.filter((p) => p.status === "pending");
  const decided = proposals.filter((p) => p.status !== "pending");

  const refreshProposals = async () => {
    const result = await base44.entities.Proposal.filter(
      { dump_id: dumpId },
      { sort: "order_index", limit: 60 }
    );
    setProposals(Array.isArray(result) ? result : result?.items || []);
  };

  const resolveArea = (proposal) => {
    if (proposal.area_id) return proposal.area_id;
    const hint = (proposal.title + " " + (proposal.detail || "")).toLowerCase();
    const match = areas.find((a) => hint.includes(a.name.toLowerCase()));
    return match?.id || "";
  };

  const approve = async (proposal) => {
    setBusyId(proposal.id);
    setError("");
    try {
      await approveProposal({ ...proposal, area_id: resolveArea(proposal) });
      await refreshProposals();
    } catch (err) {
      setError(err?.message || "Could not add that item.");
    } finally {
      setBusyId("");
    }
  };

  const approveAll = async () => {
    setBusyId("all");
    setError("");
    try {
      for (const proposal of pending) {
        await approveProposal({ ...proposal, area_id: resolveArea(proposal) });
      }
      await refreshProposals();
    } catch (err) {
      setError(err?.message || "Some items could not be added.");
    } finally {
      setBusyId("");
    }
  };

  const ignore = async (proposal) => {
    setBusyId(proposal.id);
    try {
      await ignoreProposal(proposal);
      await refreshProposals();
    } finally {
      setBusyId("");
    }
  };

  const saveEdit = async (proposal) => {
    await base44.entities.Proposal.update(proposal.id, {
      title: proposal.title,
      detail: proposal.detail,
      area_id: proposal.area_id,
    });
    await refreshProposals();
  };

  const markReviewed = async () => {
    await base44.entities.BrainDump.update(dumpId, {
      status: "reviewed",
      reviewed_at: new Date().toISOString(),
    });
    reload();
  };

  const deleteDump = async () => {
    for (const proposal of proposals) {
      await base44.entities.Proposal.delete(proposal.id);
    }
    await base44.entities.BrainDump.delete(dumpId);
    navigate({ to: "/brain-dump" });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <BackLink to="/brain-dump">Brain dump</BackLink>
        <LoadingBlock rows={4} />
      </div>
    );
  }

  if (!dump) {
    return (
      <div className="space-y-4">
        <BackLink to="/brain-dump">Brain dump</BackLink>
        <EmptyState
          icon={Inbox}
          title="That dump isn't here"
          description="It may have been deleted, or it belongs to another account."
          action={
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to="/brain-dump">Back to brain dump</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-3">
        <BackLink to="/brain-dump">Brain dump</BackLink>
        <PageHeader
          eyebrow={`${fmtDate(dump.created_date, "MMMM d")} · ${fmtTime(dump.created_date)}`}
          title="Your words, organized"
          description="Nothing has been added to your life yet. Check each item, then keep what's useful."
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteDump}
              className="gap-1.5 rounded-full text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete dump
            </Button>
          }
        />
      </div>

      <Surface className="border-l-2 border-l-primary/40 p-4 sm:p-5">
        <p className="eyebrow">Original thoughts</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
          {dump.raw_text}
        </p>
      </Surface>

      <section aria-label="AI organized results" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="text-base font-medium tracking-tight">What I found</h2>
            <span className="tabular rounded-full bg-secondary px-2 py-0.5 text-[11px]">
              {pending.length} to review
            </span>
          </div>
          {pending.length > 1 ? (
            <Button size="sm" onClick={approveAll} disabled={!!busyId} className="gap-1.5 rounded-full">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Add all {pending.length}
            </Button>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {proposalsLoading ? <LoadingBlock rows={3} /> : null}

        {!proposalsLoading && !proposals.length ? (
          <EmptyState
            icon={Inbox}
            title="Nothing was extracted from this one"
            description="Sometimes a dump is just thinking out loud. You can organize it later, or let it sit."
            action={
              <Button size="sm" variant="outline" className="rounded-full" onClick={markReviewed}>
                Mark as reviewed
              </Button>
            }
          />
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {pending.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              area={byId[resolveArea(proposal)]}
              busy={busyId === proposal.id || busyId === "all"}
              onApprove={approve}
              onIgnore={ignore}
              onEdit={saveEdit}
            />
          ))}
        </div>

        {decided.length ? (
          <details className="rounded-2xl border border-border/70 bg-card/60 p-4">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Already decided ({decided.length})
            </summary>
            <ul className="mt-3 space-y-1.5 text-sm">
              {decided.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className={p.status === "ignored" ? "text-muted-foreground line-through" : ""}>
                    {p.title}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {p.status === "approved" ? `Added to ${p.created_record_type || "records"}` : "Ignored"}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {dump.status !== "reviewed" ? (
          <Button variant="outline" onClick={markReviewed} className="rounded-full">
            Mark as reviewed
          </Button>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 text-area-sage" aria-hidden="true" />
            Reviewed · {fmtDate(dump.reviewed_at, "MMM d")}
          </p>
        )}
      </section>
    </div>
  );
}