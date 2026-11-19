import { NextResponse } from "next/server";

// Built in Stage 4 (BUILD_PLAN section 6).
export async function POST() {
  return NextResponse.json({ error: "not_implemented", stage: 4 }, { status: 501 });
}
