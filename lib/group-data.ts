import { PHOTO_BUCKET } from "@/lib/supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getGroupPayload(supabase: SupabaseClient, group: { id: string; name: string; poster_path?: string | null }) {
  const { data: rows, error } = await supabase
    .from("photos")
    .select("id, mission, slot, filename, photographer, storage_path")
    .eq("group_id", group.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const photos = await Promise.all((rows ?? []).map(async (photo) => {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(photo.storage_path, 3600);
    return { id: photo.id, mission: photo.mission, slot: String(photo.slot), filename: photo.filename, photographer: photo.photographer, url: data?.signedUrl ?? "" };
  }));
  let posterUrl: string | null = null;
  if (group.poster_path) {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(group.poster_path, 3600);
    posterUrl = data?.signedUrl ?? null;
  }
  return { group: { id: group.id, name: group.name, photos, posterUrl } };
}
