import { describe, expect, it } from "vitest";

import { PROVIDER_CONFIG_LIMITS } from "../config/limits";
import {
  NEWAPI_CHANNEL_CONNECTION_TYPE,
  parseNewApiChannelConnection,
} from "../lib/providers/channelConnection";

describe("New API channel connections", () => {
  it("parses and normalizes a valid connection", () => {
    const result = parseNewApiChannelConnection(
      JSON.stringify({
        _type: NEWAPI_CHANNEL_CONNECTION_TYPE,
        key: "  sk-example  ",
        url: "https://newapi.keepkin.cn/?ignored=1#section",
      }),
    );

    expect(result).toEqual({
      ok: true,
      connection: {
        apiKey: "sk-example",
        baseUrl: "https://newapi.keepkin.cn",
        providerName: "New API (newapi.keepkin.cn)",
      },
    });
  });

  it("rejects malformed or unsupported connection data", () => {
    expect(parseNewApiChannelConnection("")).toEqual({
      ok: false,
      error: "empty",
    });
    expect(parseNewApiChannelConnection("not-json")).toEqual({
      ok: false,
      error: "invalid_json",
    });
    expect(
      parseNewApiChannelConnection(
        JSON.stringify({
          _type: "other",
          key: "sk-example",
          url: "https://example.com",
        }),
      ),
    ).toEqual({ ok: false, error: "unsupported_type" });
  });

  it("requires bounded credentials and a safe base URL shape", () => {
    expect(
      parseNewApiChannelConnection(
        JSON.stringify({
          _type: NEWAPI_CHANNEL_CONNECTION_TYPE,
          key: "",
          url: "https://example.com",
        }),
      ),
    ).toEqual({ ok: false, error: "missing_key" });

    expect(
      parseNewApiChannelConnection(
        JSON.stringify({
          _type: NEWAPI_CHANNEL_CONNECTION_TYPE,
          key: "k".repeat(PROVIDER_CONFIG_LIMITS.maxApiKeyChars + 1),
          url: "https://example.com",
        }),
      ),
    ).toEqual({ ok: false, error: "key_too_long" });

    expect(
      parseNewApiChannelConnection(
        JSON.stringify({
          _type: NEWAPI_CHANNEL_CONNECTION_TYPE,
          key: "sk-example",
          url: "https://user:password@example.com",
        }),
      ),
    ).toEqual({ ok: false, error: "invalid_url" });

    expect(
      parseNewApiChannelConnection(
        JSON.stringify({
          _type: NEWAPI_CHANNEL_CONNECTION_TYPE,
          key: "sk-example",
          url: "javascript:alert(1)",
        }),
      ),
    ).toEqual({ ok: false, error: "invalid_url" });
  });
});
