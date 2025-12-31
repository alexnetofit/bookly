"use client";

import { useState } from "react";
import { useUser } from "@/hooks/useUser";
import { Card, CardContent, Button } from "@/components/ui";
import { Check, Sparkles, Rocket, Crown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    id: "free",
    name: "Grátis",
    price: "R$ 0",
    period: "para sempre",
    description: "Perfeito para começar sua jornada literária",
    features: [
      "Até 3 livros na estante",
      "Acompanhamento de leitura",
      "Estatísticas básicas",
    ],
    limitations: [
      "Sem acesso à comunidade",
      "Sem metas anuais",
    ],
    icon: Sparkles,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    buttonVariant: "outline" as const,
    popular: false,
  },
  {
    id: "explorer",
    name: "Explorador de Páginas",
    price: "R$ 39,90",
    period: "3 meses",
    description: "Ideal para leitores que querem mais",
    features: [
      "Livros ilimitados",
      "Acesso à comunidade",
      "Metas de leitura anuais",
      "Estatísticas completas",
      "Suporte prioritário",
    ],
    limitations: [],
    icon: Rocket,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    buttonVariant: "default" as const,
    popular: false,
  },
  {
    id: "traveler",
    name: "Viajante de Histórias",
    price: "R$ 59,90",
    period: "6 meses",
    description: "O favorito dos leitores assíduos",
    features: [
      "Livros ilimitados",
      "Acesso à comunidade",
      "Metas de leitura anuais",
      "Estatísticas completas",
      "Suporte prioritário",
      "Economia de 25%",
    ],
    limitations: [],
    icon: Crown,
    color: "text-primary",
    bgColor: "bg-primary/10",
    buttonVariant: "default" as const,
    popular: true,
  },
  {
    id: "devourer",
    name: "Devorador de Mundos",
    price: "R$ 97,00",
    period: "12 meses",
    description: "Para verdadeiros apaixonados por livros",
    features: [
      "Livros ilimitados",
      "Acesso à comunidade",
      "Metas de leitura anuais",
      "Estatísticas completas",
      "Suporte prioritário",
      "Economia de 40%",
      "Acesso antecipado a novidades",
    ],
    limitations: [],
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    buttonVariant: "default" as const,
    popular: false,
  },
];

export default function PlanosPage() {
  const { profile } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const currentPlan = profile?.plan || "free";
  const isSubscriptionActive = profile?.subscription_expires_at 
    ? new Date(profile.subscription_expires_at) > new Date() 
    : false;

  const handleCheckout = async (planId: string) => {
    if (planId === "free") return;
    
    setLoadingPlan(planId);
    
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Erro ao criar checkout:", data.error);
        alert("Erro ao processar pagamento. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro:", error);
      alert("Erro ao processar pagamento. Tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const formatExpirationDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold">Escolha seu Plano</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Desbloqueie todo o potencial da sua leitura com nossos planos premium
        </p>
      </div>

      {/* Current Plan Info */}
      {isSubscriptionActive && profile?.subscription_expires_at && (
        <div className="max-w-md mx-auto">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Seu plano atual: <span className="font-semibold text-foreground capitalize">{currentPlan}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Válido até {formatExpirationDate(profile.subscription_expires_at)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlan === plan.id && (plan.id === "free" || isSubscriptionActive);
          const isLoading = loadingPlan === plan.id;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative overflow-hidden transition-all hover:shadow-lg",
                plan.popular && "ring-2 ring-primary shadow-lg",
                isCurrentPlan && "ring-2 ring-green-500"
              )}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  Mais Popular
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute top-0 left-0 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-br-lg">
                  Seu Plano
                </div>
              )}

              <CardContent className="p-6 space-y-6">
                {/* Icon & Name */}
                <div className="text-center space-y-3">
                  <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mx-auto", plan.bgColor)}>
                    <Icon className={cn("w-6 h-6", plan.color)} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="text-center">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-center">—</span>
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>

                {/* Button */}
                <Button
                  variant={plan.buttonVariant}
                  className="w-full"
                  disabled={isCurrentPlan || isLoading || plan.id === "free"}
                  onClick={() => handleCheckout(plan.id)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : isCurrentPlan ? (
                    "Plano Atual"
                  ) : plan.id === "free" ? (
                    "Plano Gratuito"
                  ) : (
                    "Assinar Agora"
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ or Info */}
      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        <p>
          Pagamento seguro via Stripe. Você pode cancelar a qualquer momento.
          Após a compra, seu plano será ativado automaticamente.
        </p>
      </div>
    </div>
  );
}

