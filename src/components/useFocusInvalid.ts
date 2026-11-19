"use client";

import { useEffect, type RefObject } from "react";

/**
 * After a failed submit, move focus to the first invalid control (and bring it into view) so
 * screen-reader and keyboard users land on the problem instead of staying on the button.
 */
export function useFocusInvalid(formRef: RefObject<HTMLFormElement | null>, errorSignature: string) {
  useEffect(() => {
    if (!errorSignature) return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!first) return;
    first.focus({ preventScroll: true });
    first.scrollIntoView({ block: "center" });
  }, [formRef, errorSignature]);
}
