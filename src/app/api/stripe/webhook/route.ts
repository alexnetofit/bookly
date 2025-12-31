import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Inicializar Stripe de forma lazy para evitar erro durante build
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
  });
}

// Duração dos planos em meses
const PLAN_DURATIONS: Record<string, number> = {
  explorer: 3,   // 3 meses
  traveler: 6,   // 6 meses
  devourer: 12,  // 12 meses
};

// Criar cliente Supabase admin
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  const stripe = getStripe();

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Processar evento checkout.session.completed (nova assinatura)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    const userId = session.metadata?.user_id;
    const plan = session.metadata?.plan;

    if (!userId || !plan) {
      console.error("Missing metadata in session:", session.id);
      return NextResponse.json(
        { error: "Missing metadata" },
        { status: 400 }
      );
    }

    // Calcular data de expiração
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (PLAN_DURATIONS[plan] || 3));

    // Salvar subscription_id e customer_id para futuros upgrades/downgrades
    const { error: updateError } = await supabaseAdmin
      .from("users_profile")
      .update({
        plan: plan,
        subscription_expires_at: expiresAt.toISOString(),
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user plan:", updateError);
      return NextResponse.json(
        { error: "Failed to update subscription" },
        { status: 500 }
      );
    }

    console.log(`Subscription activated: user=${userId}, plan=${plan}, expires=${expiresAt.toISOString()}`);
  }

  // Processar reembolso (charge.refunded)
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const customerId = charge.customer as string;
    const customerEmail = charge.billing_details?.email || charge.receipt_email;

    console.log(`Processing refund - customerId: ${customerId}, email: ${customerEmail}`);

    let updated = false;

    // Primeiro tentar pelo stripe_customer_id (mais confiável)
    if (customerId) {
      const { error: updateError, data } = await supabaseAdmin
        .from("users_profile")
        .update({
          plan: "free",
          subscription_expires_at: null,
          stripe_subscription_id: null,
        })
        .eq("stripe_customer_id", customerId)
        .select();

      if (!updateError && data && data.length > 0) {
        console.log(`Plan reverted to free for customer: ${customerId}`);
        updated = true;
      } else {
        console.log(`No user found with stripe_customer_id: ${customerId}`);
      }
    }

    // Se não encontrou pelo customer_id, tentar pelo email
    if (!updated && customerEmail) {
      const { error: updateError, data } = await supabaseAdmin
        .from("users_profile")
        .update({
          plan: "free",
          subscription_expires_at: null,
          stripe_subscription_id: null,
        })
        .eq("email", customerEmail)
        .select();

      if (!updateError && data && data.length > 0) {
        console.log(`Plan reverted to free for email: ${customerEmail}`);
        updated = true;
      } else {
        console.log(`No user found with email: ${customerEmail}`);
      }
    }

    if (!updated) {
      console.error(`Could not find user to revert plan. customerId: ${customerId}, email: ${customerEmail}`);
    }
  }

  // Processar cancelamento de subscription
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const subscriptionId = subscription.id;
    const customerId = subscription.customer as string;

    console.log(`Processing subscription deleted - subscriptionId: ${subscriptionId}, customerId: ${customerId}`);

    let updated = false;

    // Primeiro tentar pela subscription_id
    if (subscriptionId) {
      const { error: updateError, data } = await supabaseAdmin
        .from("users_profile")
        .update({
          plan: "free",
          subscription_expires_at: null,
          stripe_subscription_id: null,
        })
        .eq("stripe_subscription_id", subscriptionId)
        .select();

      if (!updateError && data && data.length > 0) {
        console.log(`Plan reverted to free for subscription: ${subscriptionId}`);
        updated = true;
      }
    }

    // Se não encontrou, tentar pelo customer_id
    if (!updated && customerId) {
      const { error: updateError, data } = await supabaseAdmin
        .from("users_profile")
        .update({
          plan: "free",
          subscription_expires_at: null,
          stripe_subscription_id: null,
        })
        .eq("stripe_customer_id", customerId)
        .select();

      if (!updateError && data && data.length > 0) {
        console.log(`Plan reverted to free for customer: ${customerId}`);
        updated = true;
      }
    }

    if (!updated) {
      console.error(`Could not find user to revert plan on subscription delete. subscriptionId: ${subscriptionId}, customerId: ${customerId}`);
    }
  }

  return NextResponse.json({ received: true });
}

// Desabilitar parsing do body (necessário para verificar assinatura)
export const config = {
  api: {
    bodyParser: false,
  },
};

