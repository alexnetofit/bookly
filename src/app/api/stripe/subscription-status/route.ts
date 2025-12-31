import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
  });
}

export async function GET() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe não configurado" },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    
    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    // Buscar subscription_id do profile
    const { data: profile } = await supabase
      .from("users_profile")
      .select("stripe_subscription_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json({ status: null });
    }

    const stripe = getStripe();

    try {
      const subscription = await stripe.subscriptions.retrieve(
        profile.stripe_subscription_id
      ) as Stripe.Subscription;

      return NextResponse.json({
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: (subscription as unknown as { current_period_end?: number }).current_period_end || null,
        cancel_at: subscription.cancel_at,
      });
    } catch {
      // Subscription não encontrada
      return NextResponse.json({ status: null });
    }
  } catch (error) {
    console.error("Erro ao buscar status da subscription:", error);
    return NextResponse.json(
      { error: "Erro ao buscar status" },
      { status: 500 }
    );
  }
}

