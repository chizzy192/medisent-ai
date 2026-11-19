"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { isSupabaseConfigured } from "@/lib/db/env";

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
