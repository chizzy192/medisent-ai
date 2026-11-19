"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/EmptyState";
import { ButtonLink } from "@/components/ui";

/** Global error boundary: a plain sentence and a retry, in the app's language, never a white page. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorPage");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
      <EmptyState
        label={t("label")}
        title={t("title")}
        action={
          <>
            <button type="button" onClick={reset} className="btn-primary">
              {t("retry")}
            </button>
            <ButtonLink href="/" variant="outline">
              {t("home")}
            </ButtonLink>
          </>
        }
      >
        <p>{t("body")}</p>
      </EmptyState>
    </main>
  );
}
