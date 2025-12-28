import Link from "next/link";
import { BookOpen, Library, Users, Target, Star, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold">Bookly</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-32 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Star className="w-4 h-4" />
            Sua biblioteca pessoal, organizada
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Organize sua jornada de{" "}
            <span className="text-primary">leitura</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Acompanhe seus livros, defina metas anuais, compartilhe descobertas com outros leitores e transforme sua experiência de leitura.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/cadastro"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all hover:scale-105 flex items-center gap-2"
            >
              Criar conta grátis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border border-input rounded-lg font-medium hover:bg-accent transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Tudo que você precisa para sua biblioteca
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Recursos pensados para quem ama ler e quer acompanhar sua evolução
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Library className="w-6 h-6" />}
            title="Estante Virtual"
            description="Organize todos os seus livros em um só lugar, com status de leitura e avaliações."
          />
          <FeatureCard
            icon={<Target className="w-6 h-6" />}
            title="Metas Anuais"
            description="Defina quantos livros quer ler no ano e acompanhe seu progresso em tempo real."
          />
          <FeatureCard
            icon={<Star className="w-6 h-6" />}
            title="Avaliações"
            description="Avalie e acompanhe suas impressões sobre cada livro que você lê."
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Comunidade"
            description="Compartilhe suas leituras e descubra recomendações de outros leitores."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Pronto para transformar sua leitura?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Comece agora e tenha controle total sobre sua biblioteca pessoal.
          </p>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all hover:scale-105"
          >
            Começar agora
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>Bookly © {new Date().getFullYear()}</span>
          </div>
          <p>Feito com ❤️ para amantes de livros</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-all group">
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
