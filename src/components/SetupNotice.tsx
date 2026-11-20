import { tr } from "@/lib/strings";
import { FormMessage } from "./forms";

/**
 * Shown where a screen needs Supabase and the keys are missing (local development before the
 * owner adds them). Never shown in production builds with keys present.
 */
export async function SetupNotice() {
  const t = tr("setup");
  return (
    <div className="mt-4">
      <FormMessage tone="info">
        <p className="font-semibold">{t("title")}</p>
        <p className="mt-1 text-sm">{t("body")}</p>
        <pre className="mt-2 overflow-x-auto rounded-button bg-surface p-2 font-mono text-xs text-ink">
          {`NEXT_PUBLIC_SUPABASE_URL=\nNEXT_PUBLIC_SUPABASE_ANON_KEY=\nSUPABASE_SERVICE_ROLE_KEY=`}
        </pre>
      </FormMessage>
    </div>
  );
}
