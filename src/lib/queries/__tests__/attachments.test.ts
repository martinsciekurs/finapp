import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockOrder = vi.fn();
const mockCreateSignedUrl = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return {
              in: (...inArgs: unknown[]) => {
                mockIn(...inArgs);
                return {
                  order: (...orderArgs: unknown[]) => mockOrder(...orderArgs),
                };
              },
            };
          },
        };
      },
    }),
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      }),
    },
  }),
}));

import { fetchAttachmentsByRecordIds } from "../attachments";

describe("fetchAttachmentsByRecordIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty map for empty input array", async () => {
    const result = await fetchAttachmentsByRecordIds("transaction", []);

    expect(result).toEqual(new Map());
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("groups attachments by record_id with signed URLs", async () => {
    const rows = [
      { id: "a1", record_id: "r1", file_path: "u/transaction/r1/f1.pdf", file_name: "f1.pdf", file_size: 100, mime_type: "application/pdf", created_at: "2026-03-06" },
      { id: "a2", record_id: "r1", file_path: "u/transaction/r1/f2.png", file_name: "f2.png", file_size: 200, mime_type: "image/png", created_at: "2026-03-05" },
      { id: "a3", record_id: "r2", file_path: "u/transaction/r2/f3.jpg", file_name: "f3.jpg", file_size: 300, mime_type: "image/jpeg", created_at: "2026-03-04" },
    ];

    mockOrder.mockResolvedValue({ data: rows, error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.com/signed" },
      error: null,
    });

    const result = await fetchAttachmentsByRecordIds("transaction", ["r1", "r2"]);

    expect(result.size).toBe(2);
    expect(result.get("r1")).toHaveLength(2);
    expect(result.get("r2")).toHaveLength(1);
    expect(result.get("r1")![0].fileName).toBe("f1.pdf");
    expect(result.get("r1")![0].previewUrl).toBe("https://example.com/signed");
    expect(result.get("r2")![0].fileName).toBe("f3.jpg");
  });

  it("deduplicates record IDs", async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    await fetchAttachmentsByRecordIds("debt", ["r1", "r1", "r1"]);

    expect(mockIn).toHaveBeenCalledWith("record_id", ["r1"]);
  });

  it("handles null signed URL gracefully", async () => {
    const rows = [
      { id: "a1", record_id: "r1", file_path: "u/debt/r1/f.pdf", file_name: "f.pdf", file_size: 50, mime_type: "application/pdf", created_at: "2026-03-06" },
    ];

    mockOrder.mockResolvedValue({ data: rows, error: null });
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: "expired" } });

    const result = await fetchAttachmentsByRecordIds("debt", ["r1"]);

    expect(result.get("r1")![0].previewUrl).toBeNull();
  });

  it("throws on supabase query error", async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: "DB error" } });

    await expect(
      fetchAttachmentsByRecordIds("reminder", ["r1"])
    ).rejects.toThrow("Failed to fetch attachments: DB error");
  });
});
