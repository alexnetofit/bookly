import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

interface WebhookPayload {
  email: string;
  name?: string;
  plan: "explorer" | "traveler" | "devourer";
}

// Plan durations in months
const planDurations: Record<string, number> = {
  explorer: 3,   // 3 months
  traveler: 6,   // 6 months
  devourer: 12,  // 12 months
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

    // Validate webhook secret
    const webhookSecret = request.headers.get("x-webhook-secret");
    
    if (webhookSecret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Invalid webhook secret" },
        { status: 401 }
      );
    }

    // Parse payload
    const payload: WebhookPayload = await request.json();

    // Validate required fields
    if (!payload.email || !payload.plan) {
      return NextResponse.json(
        { error: "Missing required fields: email and plan" },
        { status: 400 }
      );
    }

    // Validate plan type
    if (!planDurations[payload.plan]) {
      return NextResponse.json(
        { error: "Invalid plan. Must be: explorer, traveler, or devourer" },
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

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + planDurations[payload.plan]);

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
      message: "Subscription activated successfully",
      data: {
        email: payload.email,
        plan: payload.plan,
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
  });
}

