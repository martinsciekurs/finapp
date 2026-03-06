import type { Database } from "@/lib/supabase/database.types";

export type AttachmentRecordType =
  Database["public"]["Enums"]["attachment_record_type"];

export interface AttachmentData {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  previewUrl: string | null;
}
