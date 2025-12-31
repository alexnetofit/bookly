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

    // Buscar customer_id do profile
    const { data: profile } = await supabase
      .from("users_profile")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ invoices: [] });
    }

    const stripe = getStripe();
    let invoices: Stripe.Invoice[] = [];

    // Se tem customer_id, buscar faturas diretamente
    if (profile.stripe_customer_id) {
      const response = await stripe.invoices.list({
        customer: profile.stripe_customer_id,
        limit: 20,
      });
      invoices = response.data;
    } else if (profile.email) {
      // Se não tem customer_id, buscar customer pelo email
      const customers = await stripe.customers.list({
        email: profile.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        const response = await stripe.invoices.list({
          customer: customers.data[0].id,
          limit: 20,
        });
        invoices = response.data;
      }
    }

    // Formatar faturas para o frontend
    const formattedInvoices = invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount_paid / 100, // Converter de centavos
      currency: invoice.currency,
      status: invoice.status,
      created: invoice.created,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
    }));

    return NextResponse.json({ invoices: formattedInvoices });
  } catch (error) {
    console.error("Erro ao buscar faturas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar faturas" },
      { status: 500 }
    );
  }
}

