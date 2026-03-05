"use client";

import { useState } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { ReminderFormDialog } from "./reminder-form-dialog";
import { DeleteReminderDialog } from "./delete-reminder-dialog";
import {
  markOccurrencePaid,
  markOccurrenceUnpaid,
} from "@/app/dashboard/reminders/actions";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type {
  ReminderData,
  ReminderFrequency,
  ReminderOccurrence,
  GroupedOccurrences,
} from "@/lib/types/reminder";
import type { CategoryOption } from "@/lib/types/transactions";

import { FREQUENCY_LABELS } from "@/lib/config/reminders";

// ────────────────────────────────────────────
// Frequency badge
// ────────────────────────────────────────────

function FrequencyBadge({ frequency }: { frequency: ReminderFrequency }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {FREQUENCY_LABELS[frequency]}
    </span>
  );
}

// ────────────────────────────────────────────
// Category badge
// ────────────────────────────────────────────

function CategoryBadge({
  name,
  icon,
  color,
}: {
  name: string;
  icon: string;
  color: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span style={{ color }}>
        <CategoryIcon name={icon} className="size-3" />
      </span>
      {name}
    </span>
  );
}

// ────────────────────────────────────────────
// Days badge
// ────────────────────────────────────────────

function DaysBadge({ days }: { days: number }) {
  if (days === 0) return <span className="text-xs font-medium text-warning">Due today</span>;
  if (days === 1) return <span className="text-xs text-muted-foreground">Tomorrow</span>;
  if (days > 0) return <span className="text-xs text-muted-foreground">in {days} days</span>;
  if (days === -1) return <span className="text-xs font-medium text-destructive">1 day overdue</span>;
  return <span className="text-xs font-medium text-destructive">{Math.abs(days)} days overdue</span>;
}

// ────────────────────────────────────────────
// Occurrence row
// ────────────────────────────────────────────

function OccurrenceRow({
  occurrence,
  currency,
  onEditReminder,
  onDeleteReminder,
}: {
  occurrence: ReminderOccurrence;
  currency: string;
  onEditReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleMarkPaid() {
    setIsLoading(true);
    try {
      const result = await markOccurrencePaid({
        reminder_id: occurrence.reminder_id,
        due_date: occurrence.due_date,
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to mark as paid");
        return;
      }
      toast.success("Marked as paid");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkUnpaid() {
    setIsLoading(true);
    try {
      const result = await markOccurrenceUnpaid({
        reminder_id: occurrence.reminder_id,
        due_date: occurrence.due_date,
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to undo payment");
        return;
      }
      toast.success("Marked as unpaid");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="group flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:gap-3">
      {/* Left: icon + info */}
      <div className="flex flex-1 items-center gap-3">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted"
          style={{ color: occurrence.category_color }}
        >
          <CategoryIcon name={occurrence.category_icon} className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{occurrence.title}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {formatDate(occurrence.due_date)}
            </p>
            {occurrence.status !== "paid" && (
              <DaysBadge days={occurrence.days_diff} />
            )}
          </div>
        </div>
      </div>

      {/* Center: badges + amount */}
      <div className="flex flex-wrap items-center gap-2">
        <FrequencyBadge frequency={occurrence.frequency} />
        <CategoryBadge
          name={occurrence.category_name}
          icon={occurrence.category_icon}
          color={occurrence.category_color}
        />
        <span className="text-sm font-semibold">
          {formatCurrency(occurrence.amount, currency)}
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {occurrence.status === "paid" ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMarkUnpaid}
            disabled={isLoading}
            className="text-muted-foreground"
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Undo2 className="size-3.5" />
            )}
            Undo
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkPaid}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            Mark Paid
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="opacity-0 transition-opacity group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
          onClick={() => onEditReminder(occurrence.reminder_id)}
        >
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive opacity-0 transition-opacity group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
          onClick={() => onDeleteReminder(occurrence.reminder_id)}
        >
          <Trash2 className="size-3.5" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Status section
// ────────────────────────────────────────────

function StatusSection({
  title,
  icon: Icon,
  iconClassName,
  occurrences,
  currency,
  onEditReminder,
  onDeleteReminder,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  occurrences: ReminderOccurrence[];
  currency: string;
  onEditReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}) {
  if (occurrences.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={iconClassName ?? "size-4 text-muted-foreground"} />
        <h3 className="text-sm font-semibold">
          {title} ({occurrences.length})
        </h3>
      </div>
      <div className="space-y-2">
        {occurrences.map((occ) => (
          <OccurrenceRow
            key={`${occ.reminder_id}:${occ.due_date}`}
            occurrence={occ}
            currency={currency}
            onEditReminder={onEditReminder}
            onDeleteReminder={onDeleteReminder}
          />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────

interface ReminderListProps {
  data: GroupedOccurrences;
  reminders: ReminderData[];
  categories: CategoryOption[];
  currency: string;
}

export function ReminderList({
  data,
  reminders,
  categories,
  currency,
}: ReminderListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<
    ReminderData | undefined
  >();
  const [deletingReminder, setDeletingReminder] = useState<
    ReminderData | undefined
  >();

  const totalOccurrences =
    data.overdue.length + data.upcoming.length + data.paid.length;

  function handleAdd() {
    setEditingReminder(undefined);
    setFormOpen(true);
  }

  function handleEditReminder(reminderId: string) {
    const r = reminders.find((rem) => rem.id === reminderId);
    if (r) {
      setEditingReminder(r);
      setFormOpen(true);
    }
  }

  function handleDeleteReminder(reminderId: string) {
    const r = reminders.find((rem) => rem.id === reminderId);
    if (r) {
      setDeletingReminder(r);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold sm:text-2xl">
            Reminders
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upcoming bills and due dates
          </p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="size-4" />
          Add Reminder
        </Button>
      </div>

      {/* Content */}
      {totalOccurrences === 0 ? (
        <EmptyState
          icon={Bell}
          title="No reminders yet"
          description="Add a reminder to track upcoming bills and recurring payments."
          action={
            <Button onClick={handleAdd}>
              <Plus className="size-4" />
              Add Reminder
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <StatusSection
            title="Overdue"
            icon={AlertTriangle}
            iconClassName="size-4 text-destructive"
            occurrences={data.overdue}
            currency={currency}
            onEditReminder={handleEditReminder}
            onDeleteReminder={handleDeleteReminder}
          />
          <StatusSection
            title="Upcoming"
            icon={Bell}
            occurrences={data.upcoming}
            currency={currency}
            onEditReminder={handleEditReminder}
            onDeleteReminder={handleDeleteReminder}
          />
          <StatusSection
            title="Paid"
            icon={CheckCircle2}
            iconClassName="size-4 text-success"
            occurrences={data.paid}
            currency={currency}
            onEditReminder={handleEditReminder}
            onDeleteReminder={handleDeleteReminder}
          />
        </div>
      )}

      {/* Dialogs */}
      <ReminderFormDialog
        key={editingReminder?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        reminder={editingReminder}
      />

      {deletingReminder && (
        <DeleteReminderDialog
          open={!!deletingReminder}
          onOpenChange={(open) => {
            if (!open) setDeletingReminder(undefined);
          }}
          reminder={deletingReminder}
        />
      )}
    </div>
  );
}
