"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/db/admin";
import { CONTRAST_COOKIE, isTextSize, TEXT_SIZE_COOKIE, type TextSize } from "@/lib/accessibility";

/**
 * Accessibility settings (BUILD_PLAN Stage 2): three text sizes, high contrast, speech speed.
 * Saved on the profile and mirrored in cookies so the root layout can set `data-text-size`
 * and `data-contrast` on <html> before the first paint, even before the profile loads.
 */
export async function saveAccessibility(formData: FormData): Promise<void> {
  const session = await getSession();
  const raw = String(formData.get("textSize"));
  const textSize: TextSize = isTextSize(raw) ? raw : "normal";
  const highContrast = formData.get("highContrast") === "on";
  const speechRate = Math.min(1.5, Math.max(0.6, Number(formData.get("speechRate")) || 1));

  const store = await cookies();
  const opts = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };
  store.set(TEXT_SIZE_COOKIE, textSize, opts);
  store.set(CONTRAST_COOKIE, highContrast ? "high" : "normal", opts);

  if (session) {
    const admin = createAdminClient();
    await admin.from("profiles").update({ text_size: textSize, high_contrast: highContrast, speech_rate: speechRate }).eq("id", session.profile.id);
  }
  revalidatePath("/", "layout");
}
