"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteReminder } from "@/app/dashboard/reminders/actions";
import type { ReminderData } from "@/lib/types/reminder";

interface DeleteReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: ReminderData;
}

export function DeleteReminderDialog({
  open,
  onOpenChange,
  reminder,
}: DeleteReminderDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteReminder({ id: reminder.id });

      if (!result.success) {
        toast.error(result.error ?? "Failed to delete reminder");
        return;
      }

      toast.success("Reminder deleted");
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">Delete Reminder</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &ldquo;{reminder.title}&rdquo;?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
