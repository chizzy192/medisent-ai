import { NextResponse } from "next/server";

// Built in Stage 3 (BUILD_PLAN section 6).
export async function POST() {
  return NextResponse.json({ error: "not_implemented", stage: 3 }, { status: 501 });
}
