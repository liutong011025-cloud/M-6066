import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { canonicalGroupName } from "@/lib/allowed-groups";
import { getSupabaseAdmin, PHOTO_BUCKET } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
const imageGenerationTimeoutMs = 240_000;
const preferredImageModel = "doubao-seedream-5-0-pro-260628";
const retiredImageModels = new Set(["doubao-seedream-4-0-250828", "doubao-seedream-4-5-251128"]);
const required = [["form", 0], ["form", 1], ["form", 2], ["material", 0], ["light", 0], ["place", 0]] as const;

function imageModel() {
  const configured = process.env.VOLCENGINE_MODEL?.trim();
  if (!configured || retiredImageModels.has(configured)) return preferredImageModel;
  return configured;
}

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
    if (canonicalGroupName(group.name) !== group.name) return NextResponse.json({ error: "Only an assigned group can create a poster." }, { status: 403 });
    const { data: photos, error: photoError } = await supabase.from("photos").select("mission, slot, storage_path").eq("group_id", group.id);
    if (photoError) throw photoError;
    const photoList = photos ?? [];
    if (!required.every(([mission, slot]) => photoList.some((photo) => photo.mission === mission && photo.slot === slot))) {
      return NextResponse.json({ error: "Complete all six photo frames before creating the group poster." }, { status: 400 });
    }
    const missionOrder = ["form", "material", "light", "place"];
    const orderedPhotos = photoList
      .filter((photo) => missionOrder.includes(photo.mission))
      .sort((a, b) => missionOrder.indexOf(a.mission) - missionOrder.indexOf(b.mission) || a.slot - b.slot);
    if (orderedPhotos.length > 9) return NextResponse.json({ error: "This poster supports up to nine photos. Please contact your teacher." }, { status: 400 });
    const referenceGuide = missionOrder.map((mission) => {
      const indexes = orderedPhotos.flatMap((photo, index) => photo.mission === mission ? [index + 1] : []);
      return `${mission.toUpperCase()}: reference ${indexes.join(indexes.length > 1 ? " and " : "")}`;
    }).join("; ");
    const signedImages = await Promise.all(orderedPhotos.map(async (photo) => {
      const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(photo.storage_path, 3600);
      if (error || !data?.signedUrl) throw error ?? new Error("Could not prepare the reference photos.");
      return data.signedUrl;
    }));
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: imageModel(),
        prompt: `Create a polished contemporary museum field-study poster using ALL ${orderedPhotos.length} supplied reference photographs as the actual photo content. Preserve what each photo depicts and arrange every photograph as a separate image on a tactile handmade research board. The reference order is ${referenceGuide}. FORM has three distinct architectural views. MATERIAL shows facade details, LIGHT shows human-scale light and space, and PLACE & IDENTITY shows harbour skyline context. Include each optional second photo when supplied. Use a warm off-white paper ground, precise black grid lines, vermilion, cobalt, butter yellow and soft pink colour blocks, large editorial typography, restrained hand-drawn arrows and note marks. Put the exact group name “${group.name.replace(/["\\]/g, "")}” prominently in the center in large bold type. Add the exact title “M+6066” and the section titles FORM, MATERIAL, LIGHT, PLACE & IDENTITY. The result should look like a beautifully assembled student architecture field journal. Landscape 3:2 composition, crisp legible layout.`,
        image: signedImages,
        size: "2496x1664",
        output_format: "png",
        response_format: "url",
        watermark: false,
      }),
      signal: AbortSignal.timeout(imageGenerationTimeoutMs),
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
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json({ error: "The image engine took longer than four minutes. Your photos are saved; please try again." }, { status: 504 });
    }
    return NextResponse.json({ error: "Poster generation failed. Your uploaded photographs are safe; please try again." }, { status: 500 });
  }
}
