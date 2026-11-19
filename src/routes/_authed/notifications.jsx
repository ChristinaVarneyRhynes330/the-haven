import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Check, Clock, Inbox, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import { Surface } from "@/components/shared/Surface";
import { useCollection } from "@/lib/data";
import { fmtDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/notifications")({
  head: () => ({ meta: [{ title: "Notifications · LifeOS" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { items: notifications, loading, reload } = useCollection(
    "Notification",
    {},
    { sort: "-created_date", limit: 50 }
  );
  const { items: reminders, reload: reloadReminders } = useCollection(
    "Reminder",
    { status: "pending" },
    { sort: "remind_at", limit: 50 }
  );

  const markRead = async (notification) => {
    await base44.entities.Notification.update(notification.id, { read: true });
    reload();
  };

  const removeNotification = async (notification) => {
    await base44.entities.Notification.delete(notification.id);
    reload();
  };

  const completeReminder = async (reminder) => {
    await base44.entities.Reminder.update(reminder.id, { status: "done" });
    reloadReminders();
  };

  const dismissReminder = async (reminder) => {
    await base44.entities.Reminder.update(reminder.id, { status: "dismissed" });
    reloadReminders();
  };

  const snoozeReminder = async (reminder) => {
    const until = new Date();
    until.setHours(until.getHours() + 1);
    await base44.entities.Reminder.update(reminder.id, {
      status: "snoozed",
      snooze_until: until.toISOString(),
    });
    reloadReminders();
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow={unread ? `${unread} unread` : "All caught up"}
        title="Notifications"
        description="Gentle by default. Nothing here will nag you."
      />

      <section aria-label="Reminders" className="space-y-2">
        <h2 className="text-sm font-medium">Reminders</h2>
        {reminders.length ? (
          <div className="space-y-2">
            {reminders.map((reminder) => (
              <Surface key={reminder.id} className="p-3.5">
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{reminder.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {reminder.remind_at
                        ? `${fmtDate(reminder.remind_at, "MMM d")} · ${fmtTime(reminder.remind_at)}`
                        : "No time set"}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                  <Button size="sm" variant="outline" className="h-7 rounded-full px-2.5 text-xs" onClick={() => completeReminder(reminder)}>
                    Done
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 rounded-full px-2.5 text-xs text-muted-foreground" onClick={() => snoozeReminder(reminder)}>
                    Snooze 1h
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 rounded-full px-2.5 text-xs text-muted-foreground" onClick={() => dismissReminder(reminder)}>
                    Dismiss
                  </Button>
                </div>
              </Surface>
            ))}
          </div>
        ) : (
          <EmptyState icon={Clock} title="No reminders waiting" description="They'll appear here when they're due." />
        )}
      </section>

      <section aria-label="Activity" className="space-y-2">
        <h2 className="text-sm font-medium">Activity</h2>
        {loading ? <LoadingBlock rows={2} /> : null}
        {!loading && !notifications.length ? (
          <EmptyState
            icon={Bell}
            title="Nothing yet"
            description="Briefings, reviews and reminders will gather here rather than interrupting you."
          />
        ) : null}
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Surface
              key={notification.id}
              className={cn("flex items-start gap-2.5 p-3.5", !notification.read && "border-primary/30 bg-primary/[0.04]")}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{notification.title}</p>
                {notification.body ? (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{notification.body}</p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{fmtDate(notification.created_date, "MMM d")}</span>
                  {notification.route ? (
                    <Link to={notification.route} className="underline underline-offset-4">
                      Open
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-0.5">
                {!notification.read ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Mark as read" onClick={() => markRead(notification)}>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                ) : null}
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Delete notification" onClick={() => removeNotification(notification)}>
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </Surface>
          ))}
        </div>
      </section>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-xs text-muted-foreground">
        <Inbox className="h-3.5 w-3.5" aria-hidden="true" />
        Push notifications aren't connected yet — these live inside the app.
      </p>
    </div>
  );
}