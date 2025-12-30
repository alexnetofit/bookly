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

export async function PUT(request: NextRequest) {
  // Verify admin
  const { isAdmin, error } = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, plan, subscription_expires_at, is_admin } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const updateData: Record<string, unknown> = {};
    
    if (plan !== undefined) {
      updateData.plan = plan || null;
    }
    if (subscription_expires_at !== undefined) {
      updateData.subscription_expires_at = subscription_expires_at || null;
    }
    if (is_admin !== undefined) {
      updateData.is_admin = is_admin;
    }

    const { error: updateError } = await supabase
      .from("users_profile")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating subscription:", updateError);
      return NextResponse.json(
        { error: "Erro ao atualizar assinatura" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in subscription API:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}


