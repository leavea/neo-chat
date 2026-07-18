import { afterEach, describe, expect, it, vi } from "vitest";

const safeFetchJsonMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("../lib/security/safeFetch", () => ({
  safeFetchJson: safeFetchJsonMock,
}));
vi.mock("../lib/defaultConfig/server", async () => {
  const actual = await vi.importActual<
    typeof import("../lib/defaultConfig/server")
  >("../lib/defaultConfig/server");
  return actual;
});

describe("local document parser client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    safeFetchJsonMock.mockReset();
  });

  it("posts a file to the configured sidecar and returns Markdown", async () => {
    vi.stubEnv("DOCUMENT_PARSE_BASE_URL", "http://doc-parser:8000");
    safeFetchJsonMock.mockResolvedValue({
      response: new Response(null, { status: 200 }),
      data: { markdown: "# Local file" },
    });

    const { parseDocumentWithLocalParser } =
      await import("../lib/api/localDocumentParser");
    const result = await parseDocumentWithLocalParser(
      new File(["hello"], "notes.txt", { type: "text/plain" }),
    );

    expect(result).toBe("# Local file");
    expect(safeFetchJsonMock).toHaveBeenCalledWith(
      "http://doc-parser:8000/parse",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) }),
      expect.objectContaining({ timeoutMs: 120_000 }),
    );
  });

  it("does not accept an empty parser response", async () => {
    vi.stubEnv("DOCUMENT_PARSE_BASE_URL", "http://doc-parser:8000");
    safeFetchJsonMock.mockResolvedValue({
      response: new Response(null, { status: 200 }),
      data: { markdown: "   " },
    });

    const { parseDocumentWithLocalParser } =
      await import("../lib/api/localDocumentParser");

    await expect(
      parseDocumentWithLocalParser(new File(["x"], "empty.txt")),
    ).rejects.toMatchObject({
      code: "DOCUMENT_PARSER_EMPTY",
      statusCode: 422,
    });
  });

  it("fails clearly when the sidecar URL is missing", async () => {
    const { parseDocumentWithLocalParser } =
      await import("../lib/api/localDocumentParser");

    await expect(
      parseDocumentWithLocalParser(new File(["x"], "notes.txt")),
    ).rejects.toMatchObject({
      code: "DOCUMENT_PARSER_NOT_CONFIGURED",
      statusCode: 503,
    });
    expect(safeFetchJsonMock).not.toHaveBeenCalled();
  });
});
