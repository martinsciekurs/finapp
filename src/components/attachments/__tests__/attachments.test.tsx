import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { AttachmentData } from "@/lib/types/attachments";

const mockUploadAttachment = vi.fn();
const mockDeleteAttachment = vi.fn();

vi.mock("@/app/dashboard/attachments/actions", () => ({
  uploadAttachment: (...args: unknown[]) => mockUploadAttachment(...args),
  deleteAttachment: (...args: unknown[]) => mockDeleteAttachment(...args),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { Attachments } from "../attachments";

function makeAttachment(overrides: Partial<AttachmentData> = {}): AttachmentData {
  return {
    id: "att-1",
    filePath: "user-1/transaction/tx-1/att-1-receipt.png",
    fileName: "receipt.png",
    fileSize: 1024,
    mimeType: "image/png",
    createdAt: "2026-03-06T10:00:00.000Z",
    previewUrl: "https://example.com/signed",
    ...overrides,
  };
}

describe("Attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state with attach file button", () => {
    render(
      <Attachments
        recordType="transaction"
        recordId="550e8400-e29b-41d4-a716-446655440000"
        initialAttachments={[]}
      />
    );

    expect(screen.getByRole("button", { name: /attach file/i })).toBeInTheDocument();
  });

  it("renders existing attachment with preview link", () => {
    render(
      <Attachments
        recordType="transaction"
        recordId="550e8400-e29b-41d4-a716-446655440000"
        initialAttachments={[makeAttachment()]}
      />
    );

    expect(screen.getByText("receipt.png")).toBeInTheDocument();
    expect(screen.getByLabelText("Preview attachment")).toBeInTheDocument();
  });

  it("uploads attachment and updates list", async () => {
    const user = userEvent.setup();
    mockUploadAttachment.mockResolvedValue({
      success: true,
      data: {
        attachment: makeAttachment({ id: "att-2", fileName: "invoice.pdf", mimeType: "application/pdf" }),
      },
    });

    const { container } = render(
      <Attachments
        recordType="debt"
        recordId="550e8400-e29b-41d4-a716-446655440000"
        initialAttachments={[]}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    if (!input) {
      return;
    }

    await user.upload(input, new File(["demo"], "invoice.pdf", { type: "application/pdf" }));

    expect(mockUploadAttachment).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("invoice.pdf")).toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith("Attachment uploaded");
  });

  it("deletes attachment", async () => {
    const user = userEvent.setup();
    mockDeleteAttachment.mockResolvedValue({ success: true, data: { id: "att-1" } });

    render(
      <Attachments
        recordType="reminder"
        recordId="550e8400-e29b-41d4-a716-446655440000"
        initialAttachments={[makeAttachment()]}
      />
    );

    await user.click(screen.getByLabelText("Delete attachment"));

    expect(mockDeleteAttachment).toHaveBeenCalledWith({ id: "att-1" });
    expect(screen.queryByText("receipt.png")).not.toBeInTheDocument();
    expect(mockToastSuccess).toHaveBeenCalledWith("Attachment deleted");
  });
});
