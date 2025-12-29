import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

interface WebhookPayload {
  email: string;
  name?: string;
  plan: "mensal" | "trimestral" | "semestral" | "anual";
  event: "paid" | "refund";
}

// Plan durations in months
const planDurations: Record<string, number> = {
  mensal: 1,      // 1 month
  trimestral: 3,  // 3 months
  semestral: 6,   // 6 months
  anual: 12,      // 12 months
};

// Create Supabase admin client lazily
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Webhook secret validation temporarily disabled for testing
    // TODO: Re-enable after testing
    // const webhookSecret = request.headers.get("x-webhook-secret");
    // const expectedSecret = process.env.WEBHOOK_SECRET || "bookly_webhook_secret_2024";
    // if (webhookSecret !== expectedSecret) {
    //   return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
    // }

    // Parse payload
    const payload: WebhookPayload = await request.json();

    // Validate required fields
    if (!payload.email || !payload.plan || !payload.event) {
      return NextResponse.json(
        { error: "Missing required fields: email, plan, and event" },
        { status: 400 }
      );
    }

    // Validate plan type
    if (!planDurations[payload.plan]) {
      return NextResponse.json(
        { error: "Invalid plan. Must be: mensal, trimestral, semestral, or anual" },
        { status: 400 }
      );
    }

    // Validate event type
    if (!["paid", "refund"].includes(payload.event)) {
      return NextResponse.json(
        { error: "Invalid event. Must be: paid or refund" },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: profile, error: findError } = await supabaseAdmin
      .from("users_profile")
      .select("id, email, full_name")
      .eq("email", payload.email.toLowerCase())
      .single();

    if (findError || !profile) {
      return NextResponse.json(
        { error: "User not found with this email" },
        { status: 404 }
      );
    }

    let expiresAt: Date;
    let message: string;

    if (payload.event === "refund") {
      // Refund: set expiration to yesterday (immediately expired)
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() - 1);
      message = "Subscription cancelled due to refund";
    } else {
      // Paid: calculate expiration based on plan
      expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + planDurations[payload.plan]);
      message = "Subscription activated successfully";
    }

    // Update user subscription
    const { error: updateError } = await supabaseAdmin
      .from("users_profile")
      .update({
        plan: payload.plan,
        subscription_expires_at: expiresAt.toISOString(),
        full_name: payload.name || profile.full_name,
      })
      .eq("id", profile.id);

    if (updateError) {
      console.error("Error updating subscription:", updateError);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        email: payload.email,
        plan: payload.plan,
        event: payload.event,
        expires_at: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Subscription webhook endpoint",
    usage: {
      method: "POST",
      headers: {
        "x-webhook-secret": "your-webhook-secret",
        "Content-Type": "application/json",
      },
      body: {
        name: "Nome do Cliente (opcional)",
        email: "email@cliente.com (obrigatório)",
        plan: "mensal | trimestral | semestral | anual (obrigatório)",
        event: "paid | refund (obrigatório)",
      },
      events: {
        paid: "Ativa assinatura com vencimento baseado no plano",
        refund: "Cancela assinatura (vencimento para ontem)",
      },
    },
  });
}
