"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  Server,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  NEWAPI_CHANNEL_CONNECTION_EXAMPLE,
  NEWAPI_CHANNEL_CONNECTION_INPUT_MAX_CHARS,
  parseNewApiChannelConnection,
  type NewApiChannelConnectionError,
  type ParsedNewApiChannelConnection,
} from "@/lib/providers/channelConnection";
import {
  trapModalFocus,
  useModalLifecycle,
} from "@/components/ui/useModalLifecycle";

interface ProviderConnectionModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (connection: ParsedNewApiChannelConnection) => Promise<void>;
}

const ERROR_MESSAGE_KEYS: Record<NewApiChannelConnectionError, string> = {
  empty: "connectionErrorEmpty",
  invalid_json: "connectionErrorInvalidJson",
  invalid_shape: "connectionErrorInvalidJson",
  unsupported_type: "connectionErrorUnsupportedType",
  missing_key: "connectionErrorMissingKey",
  key_too_long: "connectionErrorKeyTooLong",
  missing_url: "connectionErrorMissingUrl",
  url_too_long: "connectionErrorUrlTooLong",
  invalid_url: "connectionErrorInvalidUrl",
};

const ProviderConnectionModal = ({
  open,
  onClose,
  onImport,
}: ProviderConnectionModalProps) => {
  const t = useTranslations("Providers");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const inputId = useId();
  const inputHintId = useId();
  const descriptionId = useId();
  const errorId = useId();

  useModalLifecycle({
    open,
    dialogRef,
    initialFocusRef: inputRef,
  });

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isImporting) return;

    const result = parseNewApiChannelConnection(input);
    if (!result.ok) {
      setError(t(ERROR_MESSAGE_KEYS[result.error]));
      return;
    }

    setIsImporting(true);
    setError(null);
    try {
      await onImport(result.connection);
      setInput("");
      setError(null);
      onClose();
    } catch {
      setError(t("connectionErrorImportFailed"));
    } finally {
      setIsImporting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-sm animate-in fade-in duration-200 dark:bg-black/65"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            return;
          }
          trapModalFocus(event, dialogRef.current);
        }}
        className="glass-popover flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden overscroll-contain rounded-2xl border shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300"
              aria-hidden="true"
            >
              <Server size={20} />
            </div>
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-lg font-semibold text-foreground"
              >
                {t("connectionModalTitle")}
              </h2>
              <p
                id={descriptionId}
                className="mt-1 text-sm leading-6 text-muted-foreground"
              >
                {t("connectionModalDescription")}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-5">
          <div className="space-y-2">
            <label
              htmlFor={inputId}
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              <KeyRound size={15} aria-hidden="true" />
              {t("connectionInputLabel")}
            </label>
            <textarea
              ref={inputRef}
              id={inputId}
              name="providerConnection"
              value={input}
              rows={6}
              maxLength={NEWAPI_CHANNEL_CONNECTION_INPUT_MAX_CHARS}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-invalid={Boolean(error)}
              aria-describedby={
                error ? `${inputHintId} ${errorId}` : inputHintId
              }
              placeholder={NEWAPI_CHANNEL_CONNECTION_EXAMPLE}
              onChange={(event) => {
                setInput(event.target.value);
                if (error) setError(null);
              }}
              className="w-full resize-y rounded-xl border border-border bg-muted/50 px-3 py-3 font-mono text-sm leading-6 text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <p
              id={inputHintId}
              className="text-xs leading-5 text-muted-foreground"
            >
              {t("connectionInputHint")}
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-border/70 bg-muted/40 p-3">
            <div className="text-xs font-medium text-muted-foreground">
              {t("connectionExampleLabel")}
            </div>
            <code className="mt-2 block break-all text-xs leading-5 text-foreground/80">
              {NEWAPI_CHANNEL_CONNECTION_EXAMPLE}
            </code>
          </div>

          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            {t("connectionPrivacy")}
          </p>

          <a
            href="https://newapi.keepkin.cn/keys"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-300"
          >
            {t("connectionConfigureLink")}
            <ExternalLink size={14} aria-hidden="true" />
          </a>

          {error ? (
            <div
              id={errorId}
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            >
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="submit"
              disabled={isImporting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isImporting ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ArrowRight size={16} aria-hidden="true" />
              )}
              {isImporting ? t("connectionImporting") : t("connectionImport")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ProviderConnectionModal;
