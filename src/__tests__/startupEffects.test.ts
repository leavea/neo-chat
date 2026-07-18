import { describe, expect, it } from "vitest";
import {
  getSessionPluginPresetSyncKey,
  hasConfiguredModelProvider,
  shouldDisableSearchToggle,
  shouldApplySessionPluginPreset,
  shouldPromptForProviderConnection,
  shouldResolveSelectedModelAfterBootstrap,
  shouldRunSettingsStartupEffects,
  shouldSyncSessionPlugins,
} from "../lib/app/startupEffects";
import { getSearchCompatibility } from "../lib/settings/searchRag";

describe("app startup effects", () => {
  it("waits for settings hydration before running settings writes", () => {
    expect(shouldRunSettingsStartupEffects(false)).toBe(false);
    expect(shouldRunSettingsStartupEffects(true)).toBe(true);
  });

  it("prompts once when startup resolves without a model provider", () => {
    expect(
      shouldPromptForProviderConnection({
        coreHydrated: true,
        serverConfigResolved: true,
        hasConfiguredProvider: false,
        promptHandled: false,
      }),
    ).toBe(true);
    expect(
      shouldPromptForProviderConnection({
        coreHydrated: true,
        serverConfigResolved: true,
        hasConfiguredProvider: true,
        promptHandled: false,
      }),
    ).toBe(false);
    expect(
      shouldPromptForProviderConnection({
        coreHydrated: true,
        serverConfigResolved: true,
        hasConfiguredProvider: false,
        promptHandled: true,
      }),
    ).toBe(false);
    expect(
      hasConfiguredModelProvider([
        {
          apiKey: "",
          apiKeySecret: undefined,
          isServerDefault: false,
        },
      ]),
    ).toBe(false);
    expect(
      hasConfiguredModelProvider([
        {
          apiKey: "",
          apiKeySecret: {
            v: 1,
            alg: "A256GCM",
            keyId: "key",
            iv: "iv",
            ciphertext: "encrypted",
            context: "local:provider:test:api-key",
          },
          isServerDefault: false,
        },
      ]),
    ).toBe(true);
    expect(
      hasConfiguredModelProvider([
        { apiKey: "", apiKeySecret: undefined, isServerDefault: true },
      ]),
    ).toBe(true);
  });

  it("waits for chat and settings hydration before syncing session plugins", () => {
    expect(shouldSyncSessionPlugins(false, false)).toBe(false);
    expect(shouldSyncSessionPlugins(true, false)).toBe(false);
    expect(shouldSyncSessionPlugins(false, true)).toBe(false);
    expect(shouldSyncSessionPlugins(true, true)).toBe(true);
  });

  it("applies session plugin presets when an explicit preset exists", () => {
    expect(shouldApplySessionPluginPreset(false, true, ["weather-gpt"])).toBe(
      false,
    );
    expect(shouldApplySessionPluginPreset(true, true, undefined)).toBe(false);
    expect(shouldApplySessionPluginPreset(true, true, [])).toBe(true);
    expect(shouldApplySessionPluginPreset(true, true, ["weather-gpt"])).toBe(
      true,
    );
    expect(getSessionPluginPresetSyncKey("session-1", [])).toBe("session-1:[]");
  });

  it("does not reapply a session plugin preset already synced for the current session", () => {
    const syncKey = getSessionPluginPresetSyncKey("session-1", [
      "reader",
      "weather",
    ]);

    expect(syncKey).toBe('session-1:["reader","weather"]');
    expect(
      shouldApplySessionPluginPreset(
        true,
        true,
        ["weather", "reader"],
        syncKey,
        syncKey,
      ),
    ).toBe(false);
    expect(
      shouldApplySessionPluginPreset(
        true,
        true,
        ["weather", "reader"],
        syncKey,
        getSessionPluginPresetSyncKey("session-2", ["reader", "weather"]),
      ),
    ).toBe(true);
  });

  it("waits for server model bootstrap before auto-selecting a model", () => {
    expect(
      shouldResolveSelectedModelAfterBootstrap({
        chatHydrated: true,
        settingsHydrated: true,
        coreHydrated: true,
        serverModelBootstrapReady: false,
      }),
    ).toBe(false);
  });

  it("allows auto-selection after server model bootstrap succeeds or fails", () => {
    expect(
      shouldResolveSelectedModelAfterBootstrap({
        chatHydrated: true,
        settingsHydrated: true,
        coreHydrated: true,
        serverModelBootstrapReady: true,
      }),
    ).toBe(true);
  });

  it("does not clear restored search during transient model startup", () => {
    const keylessFirecrawl = getSearchCompatibility({
      searchProvider: "firecrawl",
      searchConfig: { apiKey: "" },
      modelProviderType: "OpenAI",
    });

    expect(
      shouldDisableSearchToggle({
        chatHydrated: true,
        settingsHydrated: true,
        coreHydrated: true,
        serverModelBootstrapReady: true,
        useSearch: true,
        searchCompatibility: keylessFirecrawl,
      }),
    ).toBe(false);

    expect(
      shouldDisableSearchToggle({
        chatHydrated: true,
        settingsHydrated: true,
        coreHydrated: true,
        serverModelBootstrapReady: true,
        useSearch: true,
        searchCompatibility: {
          enabled: false,
          reason: "missing_model_provider",
        },
      }),
    ).toBe(false);

    expect(
      shouldDisableSearchToggle({
        chatHydrated: true,
        settingsHydrated: true,
        coreHydrated: true,
        serverModelBootstrapReady: true,
        useSearch: true,
        searchCompatibility: {
          enabled: false,
          reason: "missing_search_api_key",
        },
      }),
    ).toBe(true);
  });
});
