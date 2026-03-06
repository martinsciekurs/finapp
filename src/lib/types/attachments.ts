export type AttachmentRecordType = "transaction" | "debt" | "reminder";

export interface AttachmentData {
  id: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  previewUrl: string | null;
}
