import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

/** Para el healthcheck de Docker: la app responde y llega a la base. No expone datos. */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}

export const dynamic = "force-dynamic";
