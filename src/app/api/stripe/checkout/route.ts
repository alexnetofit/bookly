import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Inicializar Stripe de forma lazy para evitar erro durante build
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-12-15.clover",
  });
}

// Price IDs do Stripe
const PRICE_IDS = {
  explorer: "price_1SkDFnP1luok0Iz1fdRHaEpe",   // 3 meses - R$ 39,90
  traveler: "price_1SkDGsP1luok0Iz1t0EAlUD9",   // 6 meses - R$ 59,90
  devourer: "price_1SkDHoP1luok0Iz18bWKf9zw",   // 12 meses - R$ 97,00
};

export async function POST(request: Request) {
  try {
    // Verificar se Stripe está configurado
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY não configurada");
      return NextResponse.json(
        { error: "Pagamento não configurado. Entre em contato com o suporte." },
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

    // Pegar plano do body
    const { plan } = await request.json();

    if (!plan || !PRICE_IDS[plan as keyof typeof PRICE_IDS]) {
      return NextResponse.json(
        { error: "Plano inválido. Use: explorer, traveler ou devourer" },
        { status: 400 }
      );
    }

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
    const stripe = getStripe();

    // Buscar profile para verificar subscription existente
    const { data: profile } = await supabase
      .from("users_profile")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    // Se usuário já tem subscription ativa, fazer upgrade/downgrade com pro rata
    if (profile?.stripe_subscription_id) {
      try {
        // Buscar subscription atual
        const currentSubscription = await stripe.subscriptions.retrieve(
          profile.stripe_subscription_id
        );

        if (currentSubscription.status === "active") {
          // Fazer upgrade/downgrade com proration e cobrança imediata
          const updatedSubscription = await stripe.subscriptions.update(
            profile.stripe_subscription_id,
            {
              items: [
                {
                  id: currentSubscription.items.data[0].id,
                  price: priceId,
                },
              ],
              proration_behavior: "always_invoice", // Gera invoice imediatamente
              payment_behavior: "error_if_incomplete", // Falha se pagamento não processar
              metadata: {
                user_id: user.id,
                plan: plan,
              },
            }
          );

          // Buscar e pagar a invoice pendente imediatamente
          const invoices = await stripe.invoices.list({
            subscription: updatedSubscription.id,
            status: "open",
            limit: 1,
          });

          if (invoices.data.length > 0) {
            try {
              await stripe.invoices.pay(invoices.data[0].id);
            } catch (payError) {
              // Se falhar o pagamento, reverter a subscription
              console.error("Erro ao cobrar invoice:", payError);
              await stripe.subscriptions.update(profile.stripe_subscription_id, {
                items: [
                  {
                    id: updatedSubscription.items.data[0].id,
                    price: currentSubscription.items.data[0].price.id,
                  },
                ],
              });
              return NextResponse.json(
                { error: "Falha no pagamento. Verifique seu cartão e tente novamente." },
                { status: 400 }
              );
            }
          }

          // Atualizar plano no Supabase após pagamento confirmado
          const PLAN_DURATIONS: Record<string, number> = {
            explorer: 3,
            traveler: 6,
            devourer: 12,
          };
          
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + (PLAN_DURATIONS[plan] || 3));

          await supabase
            .from("users_profile")
            .update({
              plan: plan,
              subscription_expires_at: expiresAt.toISOString(),
            })
            .eq("id", user.id);

          // Retornar URL de sucesso direto (sem checkout)
          return NextResponse.json({ 
            url: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.babelbookshelf.com"}/planos/sucesso?upgraded=true`,
            upgraded: true,
            subscriptionId: updatedSubscription.id,
          });
        }
      } catch (subError) {
        // Se der erro ao buscar subscription, criar nova
        console.log("Subscription anterior não encontrada, criando nova...");
      }
    }

    // Criar sessão de checkout para nova subscription
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan: plan,
        },
      },
      metadata: {
        user_id: user.id,
        plan: plan,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.babelbookshelf.com"}/planos/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.babelbookshelf.com"}/planos`,
    };

    // Se já tem customer, usar o mesmo
    if (profile?.stripe_customer_id) {
      sessionOptions.customer = profile.stripe_customer_id;
    } else {
      sessionOptions.customer_email = user.email;
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Erro ao criar sessão de checkout:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return NextResponse.json(
      { error: `Erro ao processar pagamento: ${errorMessage}` },
      { status: 500 }
    );
  }
}

