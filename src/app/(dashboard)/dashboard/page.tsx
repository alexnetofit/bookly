"use client";

import { useEffect, useState, useCallback } from "react";

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Card, CardContent, CardHeader, CardTitle, Progress, Skeleton, EmptyState, Button, Modal } from "@/components/ui";
import { Book, BookOpen, BookX, Clock, FileText, Users, Target, Plus, TrendingUp, MessageCircle, Tag } from "lucide-react";
import Link from "next/link";
import type { DashboardData, Book as BookType } from "@/types/database";
import { ShareDashboard } from "@/components/features/share-dashboard";
import { getDashboardCache, setDashboardCache } from "@/lib/cache";

type ModalType = "lidos" | "lendo" | "quero_ler" | "abandonados" | "paginas" | "autores" | "generos" | "posts" | null;

export default function DashboardPage() {
  const { user, profile } = useUser();
  const currentYear = new Date().getFullYear();
  
  // Inicializa com cache se disponível
  const cachedData = user ? getDashboardCache(user.id, currentYear) : null;
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(cachedData);
  const [isLoading, setIsLoading] = useState(!cachedData);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalBooks, setModalBooks] = useState<BookType[]>([]);
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  
  const supabase = createClient();

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    
    // Se cache válido para este usuário, não busca novamente
    const existingCache = getDashboardCache(user.id, currentYear);
    if (existingCache) {
      setDashboardData(existingCache);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      // Uma única chamada RPC retorna tudo
      const { data, error } = await supabase.rpc('get_dashboard', {
        p_user_id: user.id,
        p_year: currentYear
      });

      if (error) throw error;

      const dashData = data as DashboardData;
      setDashboardData(dashData);
      
      // Salva no cache
      setDashboardCache(user.id, currentYear, dashData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentYear]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  // Busca livros por status para o modal
  const fetchBooksForModal = useCallback(async (status: string | null) => {
    if (!user) return;
    
    setIsLoadingModal(true);
    try {
      let query = supabase
        .from("books")
        .select("*")
        .eq("user_id", user.id);
      
      if (status) {
        query = query.eq("status_leitura", status);
      }
      
      const { data } = await query.order("updated_at", { ascending: false });
      setModalBooks(data || []);
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setIsLoadingModal(false);
    }
  }, [user]);

  const handleOpenModal = (type: ModalType) => {
    setActiveModal(type);
    
    switch (type) {
      case "lidos":
        fetchBooksForModal("lido");
        break;
      case "lendo":
        fetchBooksForModal("lendo");
        break;
      case "quero_ler":
        fetchBooksForModal("nao_comecou");
        break;
      case "abandonados":
        fetchBooksForModal("desistido");
        break;
      case "paginas":
      case "autores":
      case "generos":
        fetchBooksForModal(null);
        break;
      default:
        break;
    }
  };

  const stats = dashboardData?.stats;
  const goal = dashboardData?.goal;
  const topAuthors = dashboardData?.top_authors || [];
  const booksReadThisYear = dashboardData?.yearly?.books_read || stats?.books_lido || 0;
  const goalProgress = goal ? (booksReadThisYear / goal.goal_amount) * 100 : 0;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Olá, {profile?.full_name?.split(" ")[0] || "Leitor"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está o resumo da sua jornada de leitura
          </p>
        </div>
        <div className="flex gap-2">
          <ShareDashboard 
            stats={stats ? {
              lido: stats.books_lido,
              lendo: stats.books_lendo,
              nao_comecou: stats.books_nao_comecou,
              desistido: stats.books_desistido,
              total_paginas_lidas: stats.total_pages_read,
              autores_unicos: dashboardData?.unique_authors || 0,
              generos_unicos: dashboardData?.unique_genres || 0,
              total_posts: stats.total_posts,
            } : null} 
            goal={goal ?? null} 
            userName={profile?.full_name?.split(" ")[0] || "Leitor"} 
          />
          <Link href="/estante/novo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar livro
            </Button>
          </Link>
        </div>
      </div>

      {/* Annual Goal Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Meta {currentYear}
            </CardTitle>
            {goal && (
              <p className="text-sm text-muted-foreground mt-1">
                {booksReadThisYear} de {goal.goal_amount} livros
              </p>
            )}
          </div>
          <Link href="/metas">
            <Button variant="outline" size="sm">
              {goal ? "Editar meta" : "Definir meta"}
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {goal ? (
            <div className="space-y-3">
              <Progress value={goalProgress} max={100} showLabel />
              {goalProgress >= 100 && (
                <p className="text-sm text-primary font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Parabéns! Você atingiu sua meta! 🎉
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Defina uma meta anual para acompanhar seu progresso de leitura.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen className="w-5 h-5" />}
          label="Lidos"
          value={stats?.books_lido || 0}
          color="text-green-500"
          bgColor="bg-green-500/10"
          onClick={() => handleOpenModal("lidos")}
        />
        <StatCard
          icon={<Book className="w-5 h-5" />}
          label="Lendo"
          value={stats?.books_lendo || 0}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          onClick={() => handleOpenModal("lendo")}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Quero ler"
          value={stats?.books_nao_comecou || 0}
          color="text-gray-500"
          bgColor="bg-gray-500/10"
          onClick={() => handleOpenModal("quero_ler")}
        />
        <StatCard
          icon={<BookX className="w-5 h-5" />}
          label="Abandonados"
          value={stats?.books_desistido || 0}
          color="text-red-500"
          bgColor="bg-red-500/10"
          onClick={() => handleOpenModal("abandonados")}
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Páginas lidas"
          value={stats?.total_pages_read?.toLocaleString("pt-BR") || 0}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
          onClick={() => handleOpenModal("paginas")}
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Autores"
          value={dashboardData?.unique_authors || 0}
          color="text-orange-500"
          bgColor="bg-orange-500/10"
          onClick={() => handleOpenModal("autores")}
        />
        <StatCard
          icon={<Tag className="w-5 h-5" />}
          label="Gêneros"
          value={dashboardData?.unique_genres || 0}
          color="text-pink-500"
          bgColor="bg-pink-500/10"
          onClick={() => handleOpenModal("generos")}
        />
        <StatCard
          icon={<MessageCircle className="w-5 h-5" />}
          label="Posts"
          value={stats?.total_posts || 0}
          color="text-cyan-500"
          bgColor="bg-cyan-500/10"
          onClick={() => {}}
        />
      </div>

      {/* Modals */}
      <Modal isOpen={activeModal === "lidos"} onClose={() => setActiveModal(null)} title="Livros Lidos">
        {isLoadingModal ? <ModalSkeleton /> : <BooksList books={modalBooks} />}
      </Modal>

      <Modal isOpen={activeModal === "lendo"} onClose={() => setActiveModal(null)} title="Livros em Leitura">
        {isLoadingModal ? <ModalSkeleton /> : <BooksList books={modalBooks} />}
      </Modal>

      <Modal isOpen={activeModal === "quero_ler"} onClose={() => setActiveModal(null)} title="Quero Ler">
        {isLoadingModal ? <ModalSkeleton /> : <BooksList books={modalBooks} />}
      </Modal>

      <Modal isOpen={activeModal === "abandonados"} onClose={() => setActiveModal(null)} title="Livros Abandonados">
        {isLoadingModal ? <ModalSkeleton /> : <BooksList books={modalBooks} />}
      </Modal>

      <Modal isOpen={activeModal === "paginas"} onClose={() => setActiveModal(null)} title="Páginas por Livro">
        {isLoadingModal ? <ModalSkeleton /> : <PaginasList books={modalBooks} />}
      </Modal>

      <Modal isOpen={activeModal === "autores"} onClose={() => setActiveModal(null)} title="Autores">
        {isLoadingModal ? <ModalSkeleton /> : <AuthorsList books={modalBooks} />}
      </Modal>

      <Modal isOpen={activeModal === "generos"} onClose={() => setActiveModal(null)} title="Gêneros">
        {isLoadingModal ? <ModalSkeleton /> : <GenresList books={modalBooks} />}
      </Modal>

      {/* Author Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Top 5 Autores Mais Lidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topAuthors.length > 0 ? (
            <div className="space-y-3">
              {topAuthors.map((author, index) => (
                <div
                  key={author.author}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0
                        ? "bg-yellow-500/20 text-yellow-600"
                        : index === 1
                        ? "bg-gray-400/20 text-gray-600"
                        : index === 2
                        ? "bg-amber-600/20 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{author.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {author.count} {author.count === 1 ? "livro lido" : "livros lidos"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="Nenhum autor ainda"
              description="Comece a marcar livros como lidos para ver seu ranking de autores favoritos."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className="hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center ${color} mb-3`}>
          {icon}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ModalSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

// Lista de livros simples
function BooksList({ books }: { books: BookType[] }) {
  if (books.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Nenhum livro encontrado.</p>;
  }

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {books.map((book) => (
        <Link 
          key={book.id} 
          href={`/estante/${book.id}`}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.nome_do_livro} className="w-10 h-14 object-cover rounded" />
          ) : (
            <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
              <Book className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{book.nome_do_livro}</p>
            <p className="text-sm text-muted-foreground truncate">{book.autor}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// Lista de páginas por livro
function PaginasList({ books }: { books: BookType[] }) {
  const sortedBooks = [...books].sort((a, b) => (b.paginas_lidas || 0) - (a.paginas_lidas || 0));

  if (sortedBooks.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Nenhum livro encontrado.</p>;
  }

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {sortedBooks.map((book) => (
        <Link 
          key={book.id} 
          href={`/estante/${book.id}`}
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{book.nome_do_livro}</p>
            <p className="text-sm text-muted-foreground truncate">{book.autor}</p>
          </div>
          <div className="text-right ml-4">
            <p className="font-semibold">{book.paginas_lidas?.toLocaleString("pt-BR") || 0}</p>
            <p className="text-xs text-muted-foreground">de {book.numero_de_paginas?.toLocaleString("pt-BR") || "?"}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// Lista de autores únicos
function AuthorsList({ books }: { books: BookType[] }) {
  const authorCount: Record<string, number> = {};
  books.forEach((b) => {
    const autor = b.autor;
    authorCount[autor] = (authorCount[autor] || 0) + 1;
  });

  const authors = Object.entries(authorCount)
    .map(([autor, count]) => ({ autor, count }))
    .sort((a, b) => b.count - a.count);

  if (authors.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Nenhum autor encontrado.</p>;
  }

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {authors.map((author) => (
        <div 
          key={author.autor} 
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
        >
          <p className="font-medium">{author.autor}</p>
          <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
            {author.count} {author.count === 1 ? "livro" : "livros"}
          </span>
        </div>
      ))}
    </div>
  );
}

// Lista de gêneros únicos
function GenresList({ books }: { books: BookType[] }) {
  const genreCount: Record<string, number> = {};
  books.forEach((b) => {
    if (b.genero) {
      genreCount[b.genero] = (genreCount[b.genero] || 0) + 1;
    }
  });

  const genres = Object.entries(genreCount)
    .map(([genero, count]) => ({ genero, count }))
    .sort((a, b) => b.count - a.count);

  if (genres.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Nenhum gênero encontrado.</p>;
  }

  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {genres.map((genre) => (
        <div 
          key={genre.genero} 
          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
        >
          <p className="font-medium">{genre.genero}</p>
          <span className="px-2 py-1 bg-pink-500/10 text-pink-600 rounded-full text-sm">
            {genre.count} {genre.count === 1 ? "livro" : "livros"}
          </span>
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <Skeleton className="h-40 w-full" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <Skeleton className="h-80 w-full" />
    </div>
  );
}
