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

// Generate a random temporary password
function generateTempPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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

    const emailLower = payload.email.toLowerCase();
    let userId: string;
    let isNewUser = false;

    // Try to find existing user by email
    const { data: existingProfile } = await supabaseAdmin
      .from("users_profile")
      .select("id, email, full_name")
      .eq("email", emailLower)
      .single();

    if (existingProfile) {
      // User exists
      userId = existingProfile.id;
    } else {
      // User doesn't exist - create new user
      isNewUser = true;
      
      // Create user in Supabase Auth
      const tempPassword = generateTempPassword();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: emailLower,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: payload.name || emailLower.split("@")[0],
        },
      });

      if (createError || !newUser.user) {
        console.error("Error creating user:", createError);
        return NextResponse.json(
          { error: "Failed to create user: " + (createError?.message || "Unknown error") },
          { status: 500 }
        );
      }

      userId = newUser.user.id;

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the profile with the name if provided
      if (payload.name) {
        await supabaseAdmin
          .from("users_profile")
          .update({ full_name: payload.name })
          .eq("id", userId);
      }

      // Send password reset email so user can set their own password
      const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: emailLower,
      });

      if (resetError) {
        console.error("Error sending reset email:", resetError);
        // Don't fail the request, user can still use "forgot password" later
      }
    }

    // Calculate expiration date
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
      message = isNewUser 
        ? "User created and subscription activated successfully" 
        : "Subscription activated successfully";
    }

    // Update user subscription
    const { error: updateError } = await supabaseAdmin
      .from("users_profile")
      .update({
        plan: payload.plan,
        subscription_expires_at: expiresAt.toISOString(),
        full_name: payload.name || (existingProfile?.full_name ?? emailLower.split("@")[0]),
      })
      .eq("id", userId);

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
        new_user: isNewUser,
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
      notes: {
        new_user: "Se o usuário não existir, será criado automaticamente e receberá email para definir senha",
      },
    },
  });
}
