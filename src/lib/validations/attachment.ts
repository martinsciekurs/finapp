import { z } from "zod";

export const ALLOWED_RECORD_TYPES = ["transaction", "debt", "reminder"] as const;
export type RecordType = (typeof ALLOWED_RECORD_TYPES)[number];

const recordTypeSchema = z.enum(ALLOWED_RECORD_TYPES);

export const uploadAttachmentSchema = z.object({
  record_type: recordTypeSchema,
  record_id: z.string().uuid("Invalid record ID"),
});

export const deleteAttachmentSchema = z.object({
  id: z.string().uuid("Invalid attachment ID"),
});

export type UploadAttachmentValues = z.infer<typeof uploadAttachmentSchema>;
export type DeleteAttachmentValues = z.infer<typeof deleteAttachmentSchema>;
