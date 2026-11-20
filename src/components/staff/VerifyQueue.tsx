"use client";

import { useState } from "react";
import { tr } from "@/lib/strings";
import { EmptyState } from "@/components/EmptyState";
import { VerifyCard, type QueueEntry } from "./VerifyCard";

/**
 * The queue list. A finished action revalidates the pages that show its result, which also
 * refreshes this page's server data without the entry. The list rendered here is the snapshot
 * from the first render, so a finished card stays in place with its done message instead of
 * vanishing mid-action (even when it was the last one); the entry is gone on the next visit.
 */
export function VerifyQueue({ entries }: { entries: QueueEntry[] }) {
  const t = tr("verify");
  const [list] = useState(entries);
  if (list.length === 0) {
    return (
      <EmptyState label={t("title")} title={t("emptyTitle")}>
        <p>{t("emptyBody")}</p>
      </EmptyState>
    );
  }
  return (
    <ul className="space-y-4">
      {list.map((e) => (
        <li key={e.id}>
          <VerifyCard entry={e} />
        </li>
      ))}
    </ul>
  );
}
