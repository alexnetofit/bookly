"use client";

import { Card } from "@/components/ui";
import { Gift, Users, DollarSign, ArrowRight, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function IndiquePage() {
  const [copied, setCopied] = useState(false);
  const affiliateLink = "https://app.cakto.com.br/affiliate/invite/e651d14b-5d95-48b7-b237-a4d2ccd6090e";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Gift className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-serif">
          Indique e Ganhe
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Convide amigos e familiares para o Babel e ganhe{" "}
          <span className="text-primary font-semibold">30% de comissão recorrente</span>{" "}
          todos os meses enquanto eles forem assinantes!
        </p>
      </div>

      {/* Benefits Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mx-auto">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-lg">30% de Comissão</h3>
          <p className="text-sm text-muted-foreground">
            Receba 30% do valor da assinatura de cada pessoa que você indicar
          </p>
        </Card>

        <Card className="p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 mx-auto">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-lg">Recorrente</h3>
          <p className="text-sm text-muted-foreground">
            A comissão é paga todos os meses enquanto a pessoa continuar assinante
          </p>
        </Card>

        <Card className="p-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 mx-auto">
            <Gift className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-lg">Sem Limites</h3>
          <p className="text-sm text-muted-foreground">
            Indique quantas pessoas quiser. Quanto mais indicações, mais você ganha!
          </p>
        </Card>
      </div>

      {/* How it works */}
      <Card className="p-8">
        <h2 className="text-xl font-semibold mb-6 text-center">Como funciona?</h2>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
              1
            </div>
            <div>
              <h3 className="font-medium">Cadastre-se como afiliado</h3>
              <p className="text-sm text-muted-foreground">
                Clique no botão abaixo para se cadastrar na nossa plataforma de afiliados
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
              2
            </div>
            <div>
              <h3 className="font-medium">Compartilhe seu link exclusivo</h3>
              <p className="text-sm text-muted-foreground">
                Após o cadastro, você receberá um link único para compartilhar com amigos e familiares
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
              3
            </div>
            <div>
              <h3 className="font-medium">Receba suas comissões</h3>
              <p className="text-sm text-muted-foreground">
                Cada vez que alguém assinar através do seu link, você ganha 30% de comissão todo mês!
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* CTA */}
      <Card className="p-8 bg-primary/5 border-primary/20">
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-semibold">
            Pronto para começar a ganhar?
          </h2>
          <p className="text-muted-foreground">
            Cadastre-se agora como afiliado e comece a ganhar comissões recorrentes!
          </p>
          
          <a
            href={affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity text-lg"
          >
            Quero ser afiliado
            <ArrowRight className="w-5 h-5" />
          </a>

          <div className="pt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Ou copie o link de cadastro:
            </p>
            <div className="flex items-center justify-center gap-2">
              <code className="px-3 py-2 bg-muted rounded-lg text-xs max-w-xs truncate">
                {affiliateLink}
              </code>
              <button
                onClick={handleCopyLink}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Copiar link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}


