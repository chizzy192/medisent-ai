import { NextResponse } from "next/server";

// Built in Stage 2 (BUILD_PLAN section 6).
export async function POST() {
  return NextResponse.json({ error: "not_implemented", stage: 2 }, { status: 501 });
}
