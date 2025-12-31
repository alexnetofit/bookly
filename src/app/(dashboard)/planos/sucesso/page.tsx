"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, Button } from "@/components/ui";
import { CheckCircle, Loader2, BookOpen, ArrowRight } from "lucide-react";

export default function SucessoPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const upgraded = searchParams.get("upgraded");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    // Se é upgrade, sucesso imediato
    if (upgraded === "true") {
      setStatus("success");
      return;
    }

    // Simular verificação do pagamento
    // Na prática, o webhook já terá processado o pagamento
    const timer = setTimeout(() => {
      if (sessionId) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [sessionId, upgraded]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="text-lg">Confirmando seu pagamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <span className="text-3xl">❌</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Algo deu errado</h1>
              <p className="text-muted-foreground">
                Não conseguimos confirmar seu pagamento. Se você foi cobrado, entre em contato conosco.
              </p>
            </div>
            <Link href="/planos">
              <Button variant="outline">Voltar para Planos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {upgraded === "true" ? "Plano Atualizado! 🎉" : "Pagamento Confirmado! 🎉"}
            </h1>
            <p className="text-muted-foreground">
              {upgraded === "true" 
                ? "Seu plano foi atualizado com sucesso. A diferença de valor foi cobrada proporcionalmente."
                : "Seu plano premium foi ativado com sucesso. Agora você pode adicionar livros ilimitados!"
              }
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Link href="/estante/novo" className="block">
              <Button className="w-full">
                <BookOpen className="w-4 h-4 mr-2" />
                Adicionar Novo Livro
              </Button>
            </Link>
            
            <Link href="/dashboard" className="block">
              <Button variant="outline" className="w-full">
                Ir para Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

