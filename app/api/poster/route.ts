import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getGroupPayload } from "@/lib/group-data";
import { getSupabaseAdmin, PHOTO_BUCKET } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const required = [["form", 0], ["form", 1], ["form", 2], ["material", 0], ["light", 0], ["place", 0]] as const;

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured. The local preview can still make a poster." }, { status: 503 });
  const apiKey = process.env.VOLCENGINE_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Volcengine image generation is not connected yet. I can make a poster from your photos in this preview." }, { status: 503 });
  try {
    const body = await request.json() as { groupId?: string };
    if (!body.groupId || !/^[0-9a-f-]{36}$/i.test(body.groupId)) return NextResponse.json({ error: "Open a group before creating its poster." }, { status: 400 });
    const { data: group, error: groupError } = await supabase.from("groups").select("id, name, poster_path").eq("id", body.groupId).single();
    if (groupError || !group) throw groupError ?? new Error("Group not found.");
    const { data: photos, error: photoError } = await supabase.from("photos").select("mission, slot, photographer, storage_path").eq("group_id", group.id);
    if (photoError) throw photoError;
    const photoList = photos ?? [];
    if (!required.every(([mission, slot]) => photoList.some((photo) => photo.mission === mission && photo.slot === slot))) {
      return NextResponse.json({ error: "Complete all six photo frames before creating the group poster." }, { status: 400 });
    }
    const signedImages = await Promise.all(required.map(async ([mission, slot]) => {
      const photo = photoList.find((entry) => entry.mission === mission && entry.slot === slot)!;
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(photo.storage_path, 3600);
      if (error || !data?.signedUrl) throw error ?? new Error("Could not prepare the reference photos.");
      return data.signedUrl;
    }));
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.VOLCENGINE_MODEL || "doubao-seedream-4-0-250828",
        prompt: `Create a polished contemporary museum field-study poster using the six supplied reference photographs as the actual photo content. Preserve what each photo depicts and arrange them as a tactile handmade research board: three small architectural views under FORM, facade macro under MATERIAL, a human-scale light and space moment under LIGHT, and harbour skyline context under PLACE & IDENTITY. Use a warm off-white paper ground, precise black grid lines, vermilion, cobalt, butter yellow and soft pink colour blocks, large editorial typography, restrained hand-drawn arrows and note marks. Put the exact group name “${group.name.replace(/["\\]/g, "")}” prominently in the center in large bold type. Add the exact title “M+6066” and the section titles FORM, MATERIAL, LIGHT, PLACE & IDENTITY. The result should look like a beautifully assembled student architecture field journal. Landscape 3:2 composition, crisp legible layout.`,
        image: signedImages,
        size: "2K",
        sequential_image_generation: "disabled",
        response_format: "url",
        watermark: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const generated = await response.json() as { data?: Array<{ url?: string }>; error?: { message?: string } };
    if (!response.ok || !generated.data?.[0]?.url) throw new Error(generated.error?.message || "The image service did not return a poster.");
    const imageResponse = await fetch(generated.data[0].url);
    if (!imageResponse.ok) throw new Error("The generated poster could not be saved.");
    const posterPath = `${group.id}/poster-${randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(posterPath, await imageResponse.arrayBuffer(), { contentType: imageResponse.headers.get("content-type") || "image/png", upsert: false });
    if (uploadError) throw uploadError;
    const { error: updateError } = await supabase.from("groups").update({ poster_path: posterPath }).eq("id", group.id);
    if (updateError) throw updateError;
    if (group.poster_path) await supabase.storage.from(PHOTO_BUCKET).remove([group.poster_path]);
    const { data: poster } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(posterPath, 3600);
    if (!poster?.signedUrl) throw new Error("The poster is ready, but its preview link could not be created.");
    return NextResponse.json({ url: poster.signedUrl });
  } catch (error) {
    console.error("poster generation failed", error);
    return NextResponse.json({ error: "Poster generation failed. Your uploaded photographs are safe; please try again." }, { status: 500 });
  }
}
