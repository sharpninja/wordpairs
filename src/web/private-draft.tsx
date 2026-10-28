"use client";
import {
  type ComponentProps,
  type SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  clearDraft,
  draftValue,
  privateRevision,
  privateScope,
  setDraftValue,
  subscribePrivateState,
} from "./private-state";

export function usePrivateDraftState<T>(
  profileId: string,
  name: string,
  fallback: T,
) {
  useSyncExternalStore(subscribePrivateState, privateRevision, () => 0);
  const scope = privateScope(profileId);
  const value = draftValue<T>(scope, name) ?? fallback;
  const set = (next: SetStateAction<T>) =>
    setDraftValue(
      scope,
      name,
      typeof next === "function"
        ? (next as (v: T) => T)(draftValue<T>(scope, name) ?? fallback)
        : next,
    );
  return [value, set, () => clearDraft(scope, name)] as const;
}
type Fields = Record<string, string | boolean>;
/** Safe form fields only: no credentials, identity tokens, files or browser storage. */
export function DraftForm({
  profileId,
  draftKey,
  children,
  onInput,
  onReset,
  ...props
}: ComponentProps<"form"> & { profileId: string; draftKey: string }) {
  useSyncExternalStore(subscribePrivateState, privateRevision, () => 0);
  const scope = privateScope(profileId);
  const form = useRef<HTMLFormElement>(null);
  const saved = draftValue<Fields>(scope, draftKey);
  const hadDraft = useRef(!!saved);
  useLayoutEffect(() => {
    const fields = draftValue<Fields>(scope, draftKey);
    if (!fields || !form.current) return;
    for (const element of Array.from(form.current.elements)) {
      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLSelectElement
        )
      )
        continue;
      const value = fields[element.name];
      if (value === undefined) continue;
      if (element instanceof HTMLInputElement && element.type === "checkbox")
        element.checked = Boolean(value);
      else element.value = String(value);
    }
  }, [scope, draftKey]);
  useEffect(() => {
    if (hadDraft.current && !saved) form.current?.reset();
    hadDraft.current = !!saved;
  }, [saved]);
  return (
    <form
      {...props}
      ref={form}
      onReset={(event) => {
        clearDraft(scope, draftKey);
        onReset?.(event);
      }}
      onInput={(event) => {
        const fields: Fields = {};
        for (const element of Array.from(event.currentTarget.elements)) {
          if (
            !(
              element instanceof HTMLInputElement ||
              element instanceof HTMLTextAreaElement ||
              element instanceof HTMLSelectElement
            ) ||
            !element.name
          )
            continue;
          if (
            element instanceof HTMLInputElement &&
            ["password", "file", "hidden"].includes(element.type)
          )
            continue;
          fields[element.name] =
            element instanceof HTMLInputElement && element.type === "checkbox"
              ? element.checked
              : element.value;
        }
        setDraftValue(scope, draftKey, fields);
        onInput?.(event);
      }}
    >
      {children}
    </form>
  );
}
