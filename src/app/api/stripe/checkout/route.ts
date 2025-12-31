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

    // Criar sessão de checkout
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        plan: plan,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.babelbookshelf.com"}/planos/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://app.babelbookshelf.com"}/planos`,
    });

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

