import { NextResponse } from "next/server";
import { canonicalGroupName } from "@/lib/allowed-groups";
import { getGroupPayload } from "@/lib/group-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string };
    const name = canonicalGroupName(body.name ?? "");
    if (!name) return NextResponse.json({ error: "Only an assigned group name can enter." }, { status: 403 });
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase is not configured yet. You can still use the local field guide." }, { status: 503 });
    const { data: existing, error: lookupError } = await supabase.from("groups").select("id, name, poster_path").eq("name", name).maybeSingle();
    if (lookupError) throw lookupError;
    let group = existing;
    if (!group) {
      const inserted = await supabase.from("groups").insert({ name }).select("id, name, poster_path").single();
      if (inserted.error || !inserted.data) {
        const { data: raced, error: raceError } = await supabase.from("groups").select("id, name, poster_path").eq("name", name).maybeSingle();
        if (raceError || !raced) throw inserted.error ?? raceError ?? new Error("Could not open this group.");
        group = raced;
      } else {
        group = inserted.data;
      }
    }
    return NextResponse.json(await getGroupPayload(supabase, group));
  } catch (error) {
    console.error("group login failed", error);
    return NextResponse.json({ error: "Could not open this group. Check the Supabase setup and try again." }, { status: 500 });
  }
}
