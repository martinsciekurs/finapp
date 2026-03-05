"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  updateGroupSchema,
  type UpdateGroupValues,
} from "@/lib/validations/category";
import {
  createGroup,
  updateGroup,
} from "@/app/dashboard/settings/categories/actions";
import type { CategoryGroupData } from "@/lib/types/categories";

interface GroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "expense" | "income";
  /** If provided, we're editing this group. Otherwise creating new. */
  group?: CategoryGroupData;
}

export function GroupFormDialog({
  open,
  onOpenChange,
  type,
  group,
}: GroupFormDialogProps) {
  const isEditing = !!group;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateGroupValues>({
    resolver: zodResolver(updateGroupSchema),
    defaultValues: {
      name: group?.name ?? "",
    },
  });

  async function onSubmit(values: UpdateGroupValues) {
    setIsSubmitting(true);

    try {
      if (isEditing) {
        const result = await updateGroup(group.id, values);
        if (!result.success) {
          toast.error(result.error ?? "Failed to rename group");
          return;
        }
        toast.success("Group renamed");
      } else {
        const result = await createGroup({ name: values.name, type });
        if (!result.success) {
          toast.error(result.error ?? "Failed to create group");
          return;
        }
        toast.success("Group created");
      }

      onOpenChange(false);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif">
            {isEditing ? "Rename Group" : "Add Group"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Group name"
                      maxLength={50}
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {isEditing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
