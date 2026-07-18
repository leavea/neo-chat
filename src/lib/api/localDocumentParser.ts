import "server-only";

import { ApiError } from "../errors";
import {
  getDocParserMaxMarkdownChars,
  getDocumentParseBaseUrl,
  getDocumentParseTimeoutMs,
} from "../defaultConfig/server";
import { safeFetchJson } from "../security/safeFetch";
import type { SafeUrlPolicy } from "../security/urlPolicy";

interface LocalDocumentParserResponse {
  markdown?: unknown;
  error?: unknown;
  detail?: unknown;
}

const LOCAL_DOCUMENT_PARSER_POLICY: SafeUrlPolicy = {
  // The URL is deployment configuration, not user input. The sidecar is
  // commonly addressed as http://doc-parser:8000 from the Compose network.
  context: "docs",
  allowedProtocols: ["http:", "https:"],
  allowLocalhost: true,
  allowPrivateNetwork: true,
  allowHttp: true,
  allowLocalHttp: true,
  requireDnsResolution: false,
  maxRedirects: 0,
};

function getParserEndpoint(): string {
  const baseUrl = getDocumentParseBaseUrl().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new ApiError(
      "Local document parser is not configured",
      503,
      "DOCUMENT_PARSER_NOT_CONFIGURED",
    );
  }

  try {
    const url = new URL(`${baseUrl}/`);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw new Error("invalid protocol or credentials");
    }
    return new URL("parse", url).toString();
  } catch {
    throw new ApiError(
      "Local document parser URL is invalid",
      500,
      "DOCUMENT_PARSER_URL_INVALID",
    );
  }
}

function getResponseMessage(data: LocalDocumentParserResponse): string {
  for (const value of [data.error, data.detail]) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 500);
    }
  }
  return "Local document parser rejected the file";
}

function getResponseLimit(maxMarkdownChars: number): number {
  // Leave room for JSON escaping and metadata while keeping the response
  // bounded. This is deliberately a little higher than the UTF-8 worst case.
  return Math.min(64 * 1024 * 1024, maxMarkdownChars * 6 + 64 * 1024);
}

export async function parseDocumentWithLocalParser(
  file: File,
  options: { signal?: AbortSignal } = {},
): Promise<string> {
  const endpoint = getParserEndpoint();
  const maxMarkdownChars = getDocParserMaxMarkdownChars();
  const formData = new FormData();
  formData.append("file", file, file.name);

  let result: {
    response: Response;
    data: LocalDocumentParserResponse;
  };
  try {
    const fetchOptions = {
      policy: LOCAL_DOCUMENT_PARSER_POLICY,
      timeoutMs: getDocumentParseTimeoutMs(),
      maxResponseBytes: getResponseLimit(maxMarkdownChars),
    };
    result = await safeFetchJson<LocalDocumentParserResponse>(
      endpoint,
      {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
        signal: options.signal,
      },
      fetchOptions,
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      "Local document parser is unavailable",
      502,
      "DOCUMENT_PARSER_UNAVAILABLE",
    );
  }

  if (!result.response.ok) {
    const message = getResponseMessage(result.data || {});
    const status = result.response.status >= 500 ? 502 : result.response.status;
    throw new ApiError(
      message,
      status || 502,
      status >= 500
        ? "DOCUMENT_PARSER_UPSTREAM_ERROR"
        : "DOCUMENT_PARSER_REJECTED",
    );
  }

  const markdown = result.data?.markdown;
  if (typeof markdown !== "string") {
    throw new ApiError(
      "Local document parser returned an invalid response",
      502,
      "DOCUMENT_PARSER_INVALID_RESPONSE",
    );
  }
  if (markdown.length > maxMarkdownChars) {
    throw new ApiError(
      "Parsed Markdown is too large",
      413,
      "DOCUMENT_PARSER_OUTPUT_TOO_LARGE",
    );
  }
  if (!markdown.trim()) {
    throw new ApiError(
      "No text content was extracted from the document",
      422,
      "DOCUMENT_PARSER_EMPTY",
    );
  }

  return markdown;
}
