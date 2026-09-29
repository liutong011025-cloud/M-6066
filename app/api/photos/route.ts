import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canonicalGroupName } from "@/lib/allowed-groups";
import { getGroupPayload } from "@/lib/group-data";
import { getSupabaseAdmin, PHOTO_BUCKET } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const missions: Record<string, number> = { form: 3, material: 2, light: 2, place: 2 };

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const form = await request.formData();
    const groupId = String(form.get("groupId") ?? "");
    const mission = String(form.get("mission") ?? "");
    const slot = Number(form.get("slot"));
    const file = form.get("file");
    if (!/^[0-9a-f-]{36}$/i.test(groupId) || !(mission in missions) || !Number.isInteger(slot) || slot < 0 || slot >= missions[mission] || !(file instanceof File)) {
      return NextResponse.json({ error: "Check the group and photo details." }, { status: 400 });
    }
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 4_000_000 || file.size < 1) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP under 4 MB." }, { status: 400 });
    }
    const { data: group, error: groupError } = await supabase.from("groups").select("id, name, poster_path").eq("id", groupId).single();
    if (groupError || !group) throw groupError ?? new Error("Group not found.");
    if (canonicalGroupName(group.name) !== group.name) {
      return NextResponse.json({ error: "Only an assigned group can upload photos." }, { status: 403 });
    }
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const storagePath = `${groupId}/${mission}/${slot}-${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: oldPhoto } = await supabase.from("photos").select("storage_path").eq("group_id", groupId).eq("mission", mission).eq("slot", slot).maybeSingle();
    const { error: saveError } = await supabase.from("photos").upsert({ group_id: groupId, mission, slot, filename: file.name.slice(0, 120), photographer: group.name.slice(0, 60), storage_path: storagePath }, { onConflict: "group_id,mission,slot" });
    if (saveError) {
      await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
      throw saveError;
    }
    if (oldPhoto?.storage_path) await supabase.storage.from(PHOTO_BUCKET).remove([oldPhoto.storage_path]);
    return NextResponse.json(await getGroupPayload(supabase, group));
  } catch (error) {
    console.error("photo upload failed", error);
    return NextResponse.json({ error: "Photo could not be saved. Check your connection and try again." }, { status: 500 });
  }
}
