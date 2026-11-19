import { NextResponse } from "next/server";

// Built in Stage 5 (BUILD_PLAN section 6).
export async function POST() {
  return NextResponse.json({ error: "not_implemented", stage: 5 }, { status: 501 });
}
