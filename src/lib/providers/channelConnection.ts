import { PROVIDER_CONFIG_LIMITS } from "@/config/limits";

export const NEWAPI_CHANNEL_CONNECTION_TYPE = "newapi_channel_conn" as const;

export const NEWAPI_CHANNEL_CONNECTION_EXAMPLE = JSON.stringify({
  _type: NEWAPI_CHANNEL_CONNECTION_TYPE,
  key: "sk-...",
  url: "https://newapi.keepkin.cn",
});

export const NEWAPI_CHANNEL_CONNECTION_INPUT_MAX_CHARS =
  PROVIDER_CONFIG_LIMITS.maxApiKeyChars +
  PROVIDER_CONFIG_LIMITS.maxBaseUrlChars +
  512;

export type NewApiChannelConnectionError =
  | "empty"
  | "invalid_json"
  | "invalid_shape"
  | "unsupported_type"
  | "missing_key"
  | "key_too_long"
  | "missing_url"
  | "url_too_long"
  | "invalid_url";

export interface ParsedNewApiChannelConnection {
  apiKey: string;
  baseUrl: string;
  providerName: string;
}

export type NewApiChannelConnectionParseResult =
  | { ok: true; connection: ParsedNewApiChannelConnection }
  | { ok: false; error: NewApiChannelConnectionError };

function parseBaseUrl(
  value: string,
): Pick<ParsedNewApiChannelConnection, "baseUrl" | "providerName"> | null {
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }

    url.search = "";
    url.hash = "";

    const baseUrl = url.toString().replace(/\/+$/, "");
    const hostname = url.hostname.replace(/^www\./i, "");
    const providerName = `New API (${hostname})`.slice(
      0,
      PROVIDER_CONFIG_LIMITS.maxProviderNameChars,
    );

    return { baseUrl, providerName };
  } catch {
    return null;
  }
}

export function parseNewApiChannelConnection(
  input: string,
): NewApiChannelConnectionParseResult {
  const normalizedInput = input.trim();
  if (!normalizedInput) return { ok: false, error: "empty" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalizedInput);
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "invalid_shape" };
  }

  const value = parsed as Record<string, unknown>;
  if (value._type !== NEWAPI_CHANNEL_CONNECTION_TYPE) {
    return { ok: false, error: "unsupported_type" };
  }

  const apiKey = typeof value.key === "string" ? value.key.trim() : "";
  if (!apiKey) return { ok: false, error: "missing_key" };
  if (apiKey.length > PROVIDER_CONFIG_LIMITS.maxApiKeyChars) {
    return { ok: false, error: "key_too_long" };
  }

  const rawUrl = typeof value.url === "string" ? value.url.trim() : "";
  if (!rawUrl) return { ok: false, error: "missing_url" };
  if (rawUrl.length > PROVIDER_CONFIG_LIMITS.maxBaseUrlChars) {
    return { ok: false, error: "url_too_long" };
  }

  const provider = parseBaseUrl(rawUrl);
  if (!provider) return { ok: false, error: "invalid_url" };

  return {
    ok: true,
    connection: {
      apiKey,
      ...provider,
    },
  };
}
