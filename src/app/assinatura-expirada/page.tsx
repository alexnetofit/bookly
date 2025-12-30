"use client";

import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, CardContent } from "@/components/ui";
import { Clock, LogOut, Mail } from "lucide-react";

export default function AssinaturaExpiradaPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-destructive/5 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-destructive/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-destructive/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative animate-fade-in">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
            <Clock className="w-10 h-10 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Assinatura Expirada</h1>
            <p className="text-muted-foreground">
              Sua assinatura do Babel expirou. Renove para continuar acessando todos os recursos.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3">
            <h3 className="font-medium">O que você perde sem assinatura:</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Gerenciamento ilimitado de livros</li>
              <li>• Metas anuais de leitura</li>
              <li>• Participação na comunidade</li>
              <li>• Estatísticas detalhadas</li>
            </ul>
          </div>

          <div className="space-y-3">
            <a
              href="mailto:contato@babelbookshelf.com"
              className="w-full inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Mail className="mr-2 h-4 w-4" />
              Entrar em contato
            </a>

            <Button variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

