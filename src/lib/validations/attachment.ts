import { z } from "zod";

const recordTypeSchema = z.enum(["transaction", "debt", "reminder"]);

export const uploadAttachmentSchema = z.object({
  record_type: recordTypeSchema,
  record_id: z.string().uuid("Invalid record ID"),
});

export const deleteAttachmentSchema = z.object({
  id: z.string().uuid("Invalid attachment ID"),
});

export type UploadAttachmentValues = z.infer<typeof uploadAttachmentSchema>;
export type DeleteAttachmentValues = z.infer<typeof deleteAttachmentSchema>;
