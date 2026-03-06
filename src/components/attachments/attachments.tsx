"use client";

import { useId, useRef, useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { deleteAttachment, uploadAttachment } from "@/app/dashboard/attachments/actions";
import { Button } from "@/components/ui/button";
import type { AttachmentData, AttachmentRecordType } from "@/lib/types/attachments";

interface AttachmentsProps {
  recordType: AttachmentRecordType;
  recordId: string;
  initialAttachments: AttachmentData[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Attachments({
  recordType,
  recordId,
  initialAttachments,
}: AttachmentsProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [attachments, setAttachments] = useState<AttachmentData[]>(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleUpload(file: File): Promise<void> {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("record_type", recordType);
      formData.append("record_id", recordId);
      formData.append("file", file);

      const result = await uploadAttachment(formData);
      const uploadedAttachment = result.data?.attachment;

      if (!result.success || !uploadedAttachment) {
        toast.error(result.error ?? "Failed to upload attachment");
        return;
      }

      setAttachments((current) => [uploadedAttachment, ...current]);
      toast.success("Attachment uploaded");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(attachmentId: string): Promise<void> {
    setDeletingId(attachmentId);

    try {
      const result = await deleteAttachment({ id: attachmentId });
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete attachment");
        return;
      }

      setAttachments((current) => current.filter((item) => item.id !== attachmentId));
      toast.success("Attachment deleted");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-1">
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        className="sr-only"
        onChange={(event) => {
          const nextFile = event.target.files?.[0];
          if (nextFile) {
            void handleUpload(nextFile);
          }
        }}
      />

      {attachments.length === 0 ? (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-controls={inputId}
        >
          {isUploading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Upload className="size-3" />
          )}
          Attach file
        </Button>
      ) : (
        <div className="space-y-1">
          {attachments.map((attachment) => {
            const deletingThis = deletingId === attachment.id;
            const canPreview = !!attachment.previewUrl;

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-2 py-0.5"
              >
                <FileText className="size-3 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate text-xs text-foreground">
                  {attachment.fileName}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatFileSize(attachment.fileSize)}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  {canPreview ? (
                    <Button asChild size="icon-xs" variant="ghost" aria-label="Preview attachment">
                      <a href={attachment.previewUrl ?? "#"} target="_blank" rel="noreferrer">
                        <FileText className="size-3" />
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(attachment.id)}
                    disabled={deletingThis}
                    aria-label="Delete attachment"
                  >
                    {deletingThis ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1 px-1.5 text-xs text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            aria-controls={inputId}
          >
            {isUploading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Upload className="size-3" />
            )}
            Attach file
          </Button>
        </div>
      )}
    </div>
  );
}
