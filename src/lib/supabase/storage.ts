import { createClient } from "./client";

const AVATAR_BUCKET = "avatars";

export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient();

  // Validate file
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "Arquivo deve ser uma imagem" };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { url: null, error: "Imagem deve ter no máximo 2MB" };
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;

  try {
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { url: null, error: "Erro ao fazer upload da imagem" };
    }

    // Get public URL
    const { data } = supabase.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(fileName);

    return { url: data.publicUrl, error: null };
  } catch (error) {
    console.error("Storage error:", error);
    return { url: null, error: "Erro ao processar imagem" };
  }
}

export async function deleteAvatar(avatarUrl: string): Promise<void> {
  if (!avatarUrl) return;

  const supabase = createClient();

  try {
    // Extract filename from URL
    const urlParts = avatarUrl.split("/");
    const fileName = urlParts[urlParts.length - 1];

    await supabase.storage.from(AVATAR_BUCKET).remove([fileName]);
  } catch (error) {
    console.error("Error deleting avatar:", error);
  }
}

