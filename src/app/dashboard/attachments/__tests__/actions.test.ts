import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockStorageUpload = vi.fn();
const mockStorageRemove = vi.fn();
const mockCreateSignedUrl = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockStorageUpload(...args),
        remove: (...args: unknown[]) => mockStorageRemove(...args),
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      }),
    },
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

import { deleteAttachment, uploadAttachment } from "../actions";

const fakeUser = { id: "550e8400-e29b-41d4-a716-446655440000" };
const validRecordId = "660e8400-e29b-41d4-a716-446655440000";
const validAttachmentId = "770e8400-e29b-41d4-a716-446655440000";

function mockAuthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function chainable(terminalResult: unknown) {
  const chain = Promise.resolve(terminalResult) as Promise<unknown> &
    Record<string, unknown>;

  for (const method of ["select", "insert", "update", "delete", "eq", "in", "order"]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.single = vi.fn().mockResolvedValue(terminalResult);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminalResult);

  return { chain };
}

describe("uploadAttachment", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockStorageUpload.mockReset();
    mockStorageRemove.mockReset();
    mockCreateSignedUrl.mockReset();
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const formData = new FormData();
    formData.append("record_type", "transaction");
    formData.append("record_id", validRecordId);
    formData.append("file", new File(["demo"], "receipt.png", { type: "image/png" }));

    const result = await uploadAttachment(formData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("uploads file and returns attachment payload", async () => {
    mockAuthenticated();

    const countChain = chainable({ count: 0, error: null }).chain;
    const insertChain = chainable(undefined).chain;
    insertChain.single = vi.fn().mockResolvedValue({
      data: {
        id: validAttachmentId,
        file_path: `${fakeUser.id}/transaction/${validRecordId}/abc-receipt.png`,
        file_name: "receipt.png",
        file_size: 4,
        mime_type: "image/png",
        created_at: "2026-03-06T10:00:00.000Z",
      },
      error: null,
    });

    let attachmentsCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table !== "attachments") return {};
      attachmentsCalls += 1;
      return attachmentsCalls === 1 ? countChain : insertChain;
    });

    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.com/signed" },
      error: null,
    });

    const formData = new FormData();
    formData.append("record_type", "transaction");
    formData.append("record_id", validRecordId);
    formData.append("file", new File(["demo"], "receipt.png", { type: "image/png" }));

    const result = await uploadAttachment(formData);

    expect(result.success).toBe(true);
    expect(result.data?.attachment.fileName).toBe("receipt.png");
    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
  });

  it("returns error for unsupported file type", async () => {
    mockAuthenticated();

    const formData = new FormData();
    formData.append("record_type", "transaction");
    formData.append("record_id", validRecordId);
    formData.append("file", new File(["demo"], "malicious.html", { type: "text/html" }));

    const result = await uploadAttachment(formData);

    expect(result).toEqual({
      success: false,
      error: "File type not supported. Allowed: PNG, JPG, WebP, GIF, PDF, CSV, Excel, Word, TXT",
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("cleans up storage when db insert fails after upload", async () => {
    mockAuthenticated();

    const countChain = chainable({ count: 0, error: null }).chain;
    const insertChain = chainable(undefined).chain;
    insertChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB insert failed" },
    });

    let attachmentsCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table !== "attachments") return {};
      attachmentsCalls += 1;
      return attachmentsCalls === 1 ? countChain : insertChain;
    });

    mockStorageUpload.mockResolvedValue({ data: { path: "x" }, error: null });

    const formData = new FormData();
    formData.append("record_type", "transaction");
    formData.append("record_id", validRecordId);
    formData.append("file", new File(["demo"], "receipt.png", { type: "image/png" }));

    const result = await uploadAttachment(formData);

    expect(result).toEqual({ success: false, error: "Failed to save attachment metadata" });
    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
    expect(mockStorageRemove).toHaveBeenCalledTimes(1);
  });

  it("returns error when attachment limit is reached", async () => {
    mockAuthenticated();

    const countChain = chainable({ count: 3, error: null }).chain;
    mockFrom.mockImplementation((table: string) => {
      if (table === "attachments") return countChain;
      return {};
    });

    const formData = new FormData();
    formData.append("record_type", "debt");
    formData.append("record_id", validRecordId);
    formData.append("file", new File(["demo"], "invoice.pdf", { type: "application/pdf" }));

    const result = await uploadAttachment(formData);
    expect(result).toEqual({
      success: false,
      error: "Only 3 attachments are allowed per record",
    });
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });
});

describe("deleteAttachment", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockFrom.mockReset();
    mockStorageUpload.mockReset();
    mockStorageRemove.mockReset();
    mockCreateSignedUrl.mockReset();
  });

  it("deletes file and metadata", async () => {
    mockAuthenticated();

    const fetchChain = chainable(undefined).chain;
    fetchChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validAttachmentId,
        file_path: `${fakeUser.id}/transaction/${validRecordId}/file.png`,
      },
      error: null,
    });

    const deleteChain = chainable(undefined).chain;
    deleteChain.select = vi.fn().mockResolvedValue({
      data: [{ id: validAttachmentId }],
      error: null,
    });

    let attachmentsCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table !== "attachments") return {};
      attachmentsCalls += 1;
      return attachmentsCalls === 1 ? fetchChain : deleteChain;
    });

    mockStorageRemove.mockResolvedValue({ data: [], error: null });

    const result = await deleteAttachment({ id: validAttachmentId });

    expect(result).toEqual({ success: true, data: { id: validAttachmentId } });
    expect(mockStorageRemove).toHaveBeenCalledTimes(1);
  });

  it("returns error when attachment is missing", async () => {
    mockAuthenticated();

    const fetchChain = chainable(undefined).chain;
    fetchChain.maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "attachments") return fetchChain;
      return {};
    });

    const result = await deleteAttachment({ id: validAttachmentId });
    expect(result).toEqual({ success: false, error: "Attachment not found" });
  });
});
