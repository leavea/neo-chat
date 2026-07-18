import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  safeFetchJson: vi.fn(),
  createDocumentParseJob: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("../lib/security/safeFetch", () => ({
  safeFetchJson: mocks.safeFetchJson,
}));
vi.mock("../lib/api/docParseJobs", () => ({
  createDocumentParseJob: mocks.createDocumentParseJob,
}));
vi.mock("../lib/utils/safeServerLog", () => ({
  safeServerLogError: vi.fn(),
}));

describe("local document parse route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    mocks.safeFetchJson.mockReset();
    mocks.createDocumentParseJob.mockReset();
  });

  it("parses without a MinerU or LlamaParse key", async () => {
    vi.stubEnv("DOCUMENT_PARSE_BACKEND", "local");
    vi.stubEnv("DOCUMENT_PARSE_BASE_URL", "http://doc-parser:8000");
    mocks.safeFetchJson.mockResolvedValue({
      response: new Response(null, { status: 200 }),
      data: { markdown: "# Parsed locally" },
    });

    const formData = new FormData();
    formData.set(
      "file",
      new File(["document"], "document.pdf", { type: "application/pdf" }),
    );
    formData.set("provider", "llamaParse");
    const request = new Request("https://neo.test/api/doc-parse", {
      method: "POST",
      headers: { "content-length": "2048" },
      body: formData,
    });

    const { POST } = await import("../app/api/doc-parse/route");
    const response = await POST(request as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ markdown: "# Parsed locally" });
    expect(mocks.createDocumentParseJob).not.toHaveBeenCalled();
    expect(mocks.safeFetchJson).toHaveBeenCalledWith(
      "http://doc-parser:8000/parse",
      expect.objectContaining({ method: "POST" }),
      expect.any(Object),
    );
  });
});
