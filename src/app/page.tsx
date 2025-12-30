"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  BookOpen, 
  Library, 
  Users, 
  Target, 
  Star, 
  ArrowRight,
  ChevronDown,
  BookMarked,
  BarChart3,
  MessageCircle,
  Sparkles,
  Check,
  Quote,
  Zap,
  Heart,
  TrendingUp
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header */}
      <Header />
      
      {/* Hero */}
      <HeroSection />
      
      {/* Stats */}
      <StatsSection />
      
      {/* How it Works */}
      <HowItWorksSection />
      
      {/* Features */}
      <FeaturesSection />
      
      {/* Demo/Screenshots */}
      <DemoSection />
      
      {/* Screenshots Gallery */}
      <ScreenshotsGallery />
      
      {/* Testimonials */}
      <TestimonialsSection />
      
      {/* FAQ */}
      <FAQSection />
      
      {/* Final CTA */}
      <CTASection />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8F5]/80 backdrop-blur-md border-b border-[#E8E4DF]">
      <nav className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image 
            src="/logo_cinza.png" 
            alt="Babel" 
            width={120} 
            height={40}
            className="h-10 w-auto"
          />
        </Link>
        
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-[#5C5652] hover:text-[#2C2825] transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="px-5 py-2.5 bg-[#2C2825] text-white rounded-full text-sm font-medium hover:bg-[#3D3835] transition-all hover:scale-105"
          >
            Começar grátis
          </Link>
        </div>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#F0EBE5] text-[#8B7355] px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            A biblioteca que você sempre quis ter
          </div>
          
          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-semibold text-[#2C2825] leading-tight mb-6">
            Transforme sua relação com a{" "}
            <span className="text-[#8B7355] italic">leitura</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-lg md:text-xl text-[#5C5652] max-w-2xl mx-auto mb-10 leading-relaxed">
            Organize sua biblioteca, acompanhe seu progresso, bata metas e conecte-se 
            com uma comunidade apaixonada por livros. Tudo em um só lugar.
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/cadastro"
              className="group px-8 py-4 bg-[#2C2825] text-white rounded-full font-medium hover:bg-[#3D3835] transition-all hover:scale-105 flex items-center gap-2 shadow-lg shadow-[#2C2825]/20"
            >
              Criar minha biblioteca
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 border-2 border-[#E8E4DF] text-[#2C2825] rounded-full font-medium hover:bg-[#F0EBE5] transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 mt-12 text-sm text-[#8B8178]">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>Gratuito para começar</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>Sem cartão de crédito</span>
            </div>
          </div>
        </div>
        
        {/* Hero Image/Mockup */}
        <div className="mt-16 md:mt-20 max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-[#2C2825]/10 border border-[#E8E4DF]">
            <Image
              src="/screenshots/screenshot-estante.png"
              alt="Estante virtual do Babel"
              width={1920}
              height={1080}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { number: "500+", label: "Leitores ativos", icon: Users },
    { number: "10.000+", label: "Livros catalogados", icon: BookMarked },
    { number: "2.500+", label: "Metas batidas", icon: Target },
    { number: "4.9", label: "Avaliação média", icon: Star },
  ];

  return (
    <section className="py-16 md:py-20 bg-[#2C2825]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-[#8B7355]/20 rounded-full mb-4">
                  <Icon className="w-6 h-6 text-[#C4A97D]" />
                </div>
                <div className="text-3xl md:text-4xl font-serif font-semibold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-[#A8A29E] text-sm">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Crie sua conta",
      description: "Em menos de 1 minuto você já tem acesso à sua biblioteca pessoal.",
      icon: Zap,
    },
    {
      number: "02",
      title: "Adicione seus livros",
      description: "Busque por título, autor ou ISBN e adicione à sua estante virtual.",
      icon: BookOpen,
    },
    {
      number: "03",
      title: "Defina suas metas",
      description: "Estabeleça quantos livros quer ler no ano e acompanhe em tempo real.",
      icon: Target,
    },
    {
      number: "04",
      title: "Conecte-se",
      description: "Compartilhe descobertas e veja o que outros leitores estão lendo.",
      icon: Heart,
    },
  ];

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-[#2C2825] mb-4">
            Comece em 4 passos simples
          </h2>
          <p className="text-[#5C5652] max-w-xl mx-auto">
            Configurar sua biblioteca nunca foi tão fácil. Siga estes passos e transforme sua experiência de leitura.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative group">
                <div className="bg-white rounded-2xl p-8 border border-[#E8E4DF] hover:shadow-xl hover:shadow-[#2C2825]/5 transition-all duration-300 h-full">
                  <div className="text-[#C4A97D] font-serif text-4xl font-light mb-4 opacity-50">
                    {step.number}
                  </div>
                  <div className="w-12 h-12 bg-[#F5F2EE] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#8B7355] group-hover:text-white transition-colors">
                    <Icon className="w-6 h-6 text-[#8B7355] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#2C2825] mb-2">{step.title}</h3>
                  <p className="text-[#5C5652] text-sm leading-relaxed">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-[#E8E4DF]" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: Library,
      title: "Estante Virtual Completa",
      description: "Organize todos os seus livros em um só lugar. Físicos, ebooks e audiobooks com status de leitura, avaliações e anotações pessoais.",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: Target,
      title: "Metas Inteligentes",
      description: "Defina metas anuais personalizadas e acompanhe seu progresso com gráficos visuais. Receba motivação para manter o ritmo.",
      color: "bg-green-50 text-green-600",
    },
    {
      icon: BarChart3,
      title: "Estatísticas Detalhadas",
      description: "Visualize quanto você leu, gêneros favoritos, páginas por dia e muito mais. Entenda seus hábitos de leitura.",
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: Users,
      title: "Comunidade de Leitores",
      description: "Compartilhe suas leituras, descubra recomendações e conecte-se com pessoas que têm os mesmos gostos literários.",
      color: "bg-orange-50 text-orange-600",
    },
    {
      icon: MessageCircle,
      title: "Resenhas e Comentários",
      description: "Escreva suas impressões sobre cada livro. Marque spoilers e ajude outros leitores a descobrir novas histórias.",
      color: "bg-pink-50 text-pink-600",
    },
    {
      icon: TrendingUp,
      title: "Progresso em Tempo Real",
      description: "Atualize suas páginas lidas e veja instantaneamente quanto falta para terminar. Motivação na palma da mão.",
      color: "bg-teal-50 text-teal-600",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-[#F5F2EE]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-[#2C2825] mb-4">
            Tudo que você precisa para sua jornada
          </h2>
          <p className="text-[#5C5652] max-w-xl mx-auto">
            Recursos pensados por leitores, para leitores. Cada funcionalidade foi criada para melhorar sua experiência.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className="bg-white rounded-2xl p-8 border border-[#E8E4DF] hover:shadow-xl hover:shadow-[#2C2825]/5 hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold text-[#2C2825] mb-3">{feature.title}</h3>
                <p className="text-[#5C5652] leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DemoSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-[#2C2825] mb-6">
              Uma experiência pensada para você
            </h2>
            <p className="text-[#5C5652] text-lg mb-8 leading-relaxed">
              Interface limpa e intuitiva que coloca seus livros em destaque. 
              Navegue pela sua biblioteca, acompanhe metas e interaja com a comunidade 
              sem complicações.
            </p>
            
            <div className="space-y-4">
              {[
                "Design elegante e minimalista",
                "Funciona no celular e no computador",
                "Sincronização automática em todos dispositivos",
                "Busca rápida por título, autor ou ISBN",
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-[#2C2825]">{item}</span>
                </div>
              ))}
            </div>

            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 mt-10 px-8 py-4 bg-[#2C2825] text-white rounded-full font-medium hover:bg-[#3D3835] transition-all hover:scale-105"
            >
              Experimentar agora
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mockup */}
          <div className="relative">
            <div className="rounded-2xl shadow-2xl shadow-[#2C2825]/10 border border-[#E8E4DF] overflow-hidden">
              <Image
                src="/screenshots/screenshot-dashboard.png"
                alt="Dashboard do Babel"
                width={1920}
                height={1080}
                className="w-full h-auto"
              />
            </div>
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-4 border border-[#E8E4DF] hidden md:block">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#8B7355]" />
                <span className="text-sm font-medium text-[#2C2825]">Acompanhe suas metas</span>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg p-4 border border-[#E8E4DF] hidden md:block">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium text-[#2C2825]">Avalie seus livros</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScreenshotsGallery() {
  const screenshots = [
    {
      src: "/screenshots/screenshot-estante.png",
      title: "Sua Estante Virtual",
      description: "Organize todos os seus livros em um só lugar",
    },
    {
      src: "/screenshots/screenshot-metas.png",
      title: "Metas Anuais",
      description: "Defina e acompanhe suas metas de leitura",
    },
    {
      src: "/screenshots/screenshot-comunidade.png",
      title: "Comunidade de Leitores",
      description: "Conecte-se com outros apaixonados por livros",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-[#F5F2EE]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-[#2C2825] mb-4">
            Conheça o Babel por dentro
          </h2>
          <p className="text-[#5C5652] max-w-xl mx-auto">
            Uma interface limpa e intuitiva pensada para quem ama ler.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {screenshots.map((screenshot, index) => (
            <div key={index} className="group">
              <div className="rounded-2xl overflow-hidden shadow-lg border border-[#E8E4DF] mb-4 group-hover:shadow-xl transition-shadow">
                <Image
                  src={screenshot.src}
                  alt={screenshot.title}
                  width={800}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
              <h3 className="text-lg font-semibold text-[#2C2825] mb-1">{screenshot.title}</h3>
              <p className="text-[#5C5652] text-sm">{screenshot.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const testimonials = [
    {
      quote: "Finalmente encontrei uma forma de organizar minha biblioteca. Antes eu tinha planilhas, notas e nada funcionava. O Babel mudou tudo.",
      name: "Marina Costa",
      role: "Professora de Literatura",
      avatar: "MC",
      rating: 5,
    },
    {
      quote: "As metas anuais me motivaram a ler muito mais. Bati minha meta de 30 livros pela primeira vez! A comunidade também é incrível.",
      name: "Pedro Henrique",
      role: "Desenvolvedor de Software",
      avatar: "PH",
      rating: 5,
    },
    {
      quote: "Adoro poder ver o que meus amigos estão lendo e trocar recomendações. É como um clube do livro virtual que funciona!",
      name: "Juliana Mendes",
      role: "Designer Gráfica",
      avatar: "JM",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-[#2C2825]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-white mb-4">
            O que nossos leitores dizem
          </h2>
          <p className="text-[#A8A29E] max-w-xl mx-auto">
            Milhares de leitores já transformaram sua experiência de leitura com o Babel.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-[#3D3835] rounded-2xl p-8 border border-[#4D4845]"
            >
              <Quote className="w-10 h-10 text-[#8B7355] mb-6" />
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              
              <p className="text-[#E8E4DF] mb-6 leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#8B7355] rounded-full flex items-center justify-center text-white font-medium">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="text-white font-medium">{testimonial.name}</div>
                  <div className="text-[#A8A29E] text-sm">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "O Babel é gratuito?",
      answer: "Sim! Você pode criar sua conta gratuitamente e ter acesso às funcionalidades principais. Oferecemos também planos pagos com recursos avançados para quem quer ir além.",
    },
    {
      question: "Posso usar no celular e no computador?",
      answer: "Com certeza! O Babel funciona perfeitamente em qualquer dispositivo. Sua biblioteca está sempre sincronizada, seja no celular, tablet ou computador.",
    },
    {
      question: "Como adiciono meus livros?",
      answer: "É muito simples! Basta buscar pelo título, autor ou ISBN. Encontramos automaticamente a capa e informações do livro. Você também pode adicionar manualmente se preferir.",
    },
    {
      question: "Meus dados estão seguros?",
      answer: "Absolutamente. Utilizamos criptografia de ponta e seguimos as melhores práticas de segurança. Seus dados são seus e nunca serão compartilhados com terceiros.",
    },
    {
      question: "Posso exportar minha biblioteca?",
      answer: "Sim! Você pode exportar toda sua biblioteca a qualquer momento. Acreditamos que seus dados pertencem a você.",
    },
    {
      question: "Como funciona a comunidade?",
      answer: "Você pode compartilhar suas leituras, ver o que outros estão lendo, trocar recomendações e até marcar postagens com spoilers para proteger outros leitores.",
    },
  ];

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-[#2C2825] mb-4">
            Perguntas frequentes
          </h2>
          <p className="text-[#5C5652] max-w-xl mx-auto">
            Tire suas dúvidas sobre o Babel. Se não encontrar sua resposta, entre em contato conosco.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl border border-[#E8E4DF] overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-[#FAF8F5] transition-colors"
              >
                <span className="font-medium text-[#2C2825] pr-4">{faq.question}</span>
                <ChevronDown 
                  className={`w-5 h-5 text-[#8B8178] flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div 
                className={`overflow-hidden transition-all duration-200 ${
                  openIndex === index ? "max-h-48" : "max-h-0"
                }`}
              >
                <p className="px-6 pb-6 text-[#5C5652] leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-[#2C2825] to-[#3D3835]">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-white mb-6">
            Pronto para transformar sua jornada de leitura?
          </h2>
          <p className="text-[#A8A29E] text-lg mb-10 max-w-2xl mx-auto">
            Junte-se a milhares de leitores que já organizaram suas bibliotecas 
            e estão lendo mais do que nunca.
          </p>
          
          <Link
            href="/cadastro"
            className="group inline-flex items-center gap-2 px-10 py-5 bg-white text-[#2C2825] rounded-full font-semibold text-lg hover:bg-[#F5F2EE] transition-all hover:scale-105 shadow-2xl shadow-black/20"
          >
            Criar minha conta grátis
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <p className="text-[#8B8178] text-sm mt-6">
            Configuração em menos de 1 minuto • Sem cartão de crédito
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#FAF8F5] border-t border-[#E8E4DF]">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center">
            <Image 
              src="/logo_cinza.png" 
              alt="Babel" 
              width={100} 
              height={32}
              className="h-8 w-auto"
            />
          </div>
          
          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <a 
              href="mailto:contato@babelbookshelf.com" 
              className="text-[#5C5652] hover:text-[#2C2825] transition-colors"
            >
              Contato
            </a>
            <Link 
              href="/login" 
              className="text-[#5C5652] hover:text-[#2C2825] transition-colors"
            >
              Entrar
            </Link>
            <Link 
              href="/cadastro" 
              className="text-[#5C5652] hover:text-[#2C2825] transition-colors"
            >
              Cadastrar
            </Link>
          </div>
          
          {/* Copyright */}
          <div className="text-sm text-[#8B8178]">
            © {new Date().getFullYear()} Babel. Feito com ❤️ para amantes de livros.
          </div>
        </div>
      </div>
    </footer>
  );
}
