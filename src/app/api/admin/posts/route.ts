import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Verify if current user is admin
async function verifyAdmin(): Promise<{ isAdmin: boolean; error?: string }> {
  const supabase = await createServerClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { isAdmin: false, error: "Não autenticado" };
  }

  // Use service role to check admin status
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: profile } = await adminClient
    .from("users_profile")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { isAdmin: false, error: "Acesso negado" };
  }

  return { isAdmin: true };
}

export async function DELETE(request: NextRequest) {
  // Verify admin
  const { isAdmin, error } = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("id");

    if (!postId) {
      return NextResponse.json(
        { error: "id do post é obrigatório" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete comments first (cascade might not work with RLS)
    await supabase
      .from("post_comments")
      .delete()
      .eq("post_id", postId);

    // Delete likes
    await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId);

    // Delete the post
    const { error: deleteError } = await supabase
      .from("community_posts")
      .delete()
      .eq("id", postId);

    if (deleteError) {
      console.error("Error deleting post:", deleteError);
      return NextResponse.json(
        { error: "Erro ao excluir post" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in posts API:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

