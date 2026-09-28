import { NextResponse } from "next/server";
import { getGroupPayload } from "@/lib/group-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured yet. You can still use the local field guide." }, { status: 503 });
  try {
    const body = await request.json() as { name?: string };
    const name = body.name?.trim().slice(0, 48);
    if (!name) return NextResponse.json({ error: "Enter a group name to continue." }, { status: 400 });
    const { data: group, error } = await supabase.from("groups").upsert({ name }, { onConflict: "name" }).select("id, name, poster_path").single();
    if (error || !group) throw error ?? new Error("Could not open this group.");
    return NextResponse.json(await getGroupPayload(supabase, group));
  } catch (error) {
    console.error("group login failed", error);
    return NextResponse.json({ error: "Could not open this group. Check the Supabase setup and try again." }, { status: 500 });
  }
}
