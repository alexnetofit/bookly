"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { Card, CardContent, CardHeader, CardTitle, Progress, Skeleton, EmptyState, Button, Modal } from "@/components/ui";
import { Book, BookOpen, BookX, Clock, FileText, Users, Target, Plus, TrendingUp, MessageCircle, Tag, X } from "lucide-react";
import Link from "next/link";
import type { Book as BookType, AnnualGoal, CommunityPost } from "@/types/database";
import { ShareDashboard } from "@/components/features/share-dashboard";

type ModalType = "lidos" | "lendo" | "quero_ler" | "abandonados" | "paginas" | "autores" | "generos" | "posts" | null;

interface BookStats {
  total: number;
  lido: number;
  lendo: number;
  nao_comecou: number;
  desistido: number;
  total_paginas_lidas: number;
  autores_unicos: number;
  generos_unicos: number;
  total_posts: number;
}

interface AuthorRanking {
  autor: string;
  count: number;
}

export default function DashboardPage() {
  const { user, profile } = useUser();
  const [stats, setStats] = useState<BookStats | null>(null);
  const [goal, setGoal] = useState<AnnualGoal | null>(null);
  const [topAuthors, setTopAuthors] = useState<AuthorRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [allBooks, setAllBooks] = useState<BookType[]>([]);
  const [allPosts, setAllPosts] = useState<CommunityPost[]>([]);
  const supabase = createClient();

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch user's books only
      const { data: booksData } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", user.id);

      const books = (booksData || []) as BookType[];
      setAllBooks(books);

      // Fetch user's posts
      const { data: postsData } = await supabase
        .from("community_posts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const posts = (postsData || []) as CommunityPost[];
      setAllPosts(posts);
      const postsCount = posts.length;

      if (books.length > 0) {
        // Calculate unique genres
        const generosUnicos = new Set(
          books
            .filter((b: BookType) => b.genero)
            .map((b: BookType) => b.genero)
        ).size;

        // Calculate stats
        const statsData: BookStats = {
          total: books.length,
          lido: books.filter((b: BookType) => b.status_leitura === "lido").length,
          lendo: books.filter((b: BookType) => b.status_leitura === "lendo").length,
          nao_comecou: books.filter((b: BookType) => b.status_leitura === "nao_comecou").length,
          desistido: books.filter((b: BookType) => b.status_leitura === "desistido").length,
          total_paginas_lidas: books.reduce((acc: number, b: BookType) => acc + (b.paginas_lidas || 0), 0),
          autores_unicos: new Set(books.map((b: BookType) => b.autor.toLowerCase())).size,
          generos_unicos: generosUnicos,
          total_posts: postsCount || 0,
        };
        setStats(statsData);

        // Calculate author ranking
        const authorCount: Record<string, number> = {};
        books
          .filter((b: BookType) => b.status_leitura === "lido")
          .forEach((b: BookType) => {
            const autor = b.autor;
            authorCount[autor] = (authorCount[autor] || 0) + 1;
          });

        const ranking = Object.entries(authorCount)
          .map(([autor, count]) => ({ autor, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTopAuthors(ranking);
      }

      // Fetch annual goal
      const { data: goalData } = await supabase
        .from("annual_goals")
        .select("*")
        .eq("year", currentYear)
        .single();

      if (goalData) {
        setGoal(goalData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const booksReadThisYear = stats?.lido || 0;
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
            stats={stats} 
            goal={goal} 
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
          value={stats?.lido || 0}
          color="text-green-500"
          bgColor="bg-green-500/10"
          onClick={() => setActiveModal("lidos")}
        />
        <StatCard
          icon={<Book className="w-5 h-5" />}
          label="Lendo"
          value={stats?.lendo || 0}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
          onClick={() => setActiveModal("lendo")}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Quero ler"
          value={stats?.nao_comecou || 0}
          color="text-gray-500"
          bgColor="bg-gray-500/10"
          onClick={() => setActiveModal("quero_ler")}
        />
        <StatCard
          icon={<BookX className="w-5 h-5" />}
          label="Abandonados"
          value={stats?.desistido || 0}
          color="text-red-500"
          bgColor="bg-red-500/10"
          onClick={() => setActiveModal("abandonados")}
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Páginas lidas"
          value={stats?.total_paginas_lidas.toLocaleString("pt-BR") || 0}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
          onClick={() => setActiveModal("paginas")}
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Autores"
          value={stats?.autores_unicos || 0}
          color="text-orange-500"
          bgColor="bg-orange-500/10"
          onClick={() => setActiveModal("autores")}
        />
        <StatCard
          icon={<Tag className="w-5 h-5" />}
          label="Gêneros"
          value={stats?.generos_unicos || 0}
          color="text-pink-500"
          bgColor="bg-pink-500/10"
          onClick={() => setActiveModal("generos")}
        />
        <StatCard
          icon={<MessageCircle className="w-5 h-5" />}
          label="Posts"
          value={stats?.total_posts || 0}
          color="text-cyan-500"
          bgColor="bg-cyan-500/10"
          onClick={() => setActiveModal("posts")}
        />
      </div>

      {/* Modals */}
      <Modal isOpen={activeModal === "lidos"} onClose={() => setActiveModal(null)} title="Livros Lidos">
        <BooksList books={allBooks.filter(b => b.status_leitura === "lido")} />
      </Modal>

      <Modal isOpen={activeModal === "lendo"} onClose={() => setActiveModal(null)} title="Livros em Leitura">
        <BooksList books={allBooks.filter(b => b.status_leitura === "lendo")} />
      </Modal>

      <Modal isOpen={activeModal === "quero_ler"} onClose={() => setActiveModal(null)} title="Quero Ler">
        <BooksList books={allBooks.filter(b => b.status_leitura === "nao_comecou")} />
      </Modal>

      <Modal isOpen={activeModal === "abandonados"} onClose={() => setActiveModal(null)} title="Livros Abandonados">
        <BooksList books={allBooks.filter(b => b.status_leitura === "desistido")} />
      </Modal>

      <Modal isOpen={activeModal === "paginas"} onClose={() => setActiveModal(null)} title="Páginas por Livro">
        <PaginasList books={allBooks} />
      </Modal>

      <Modal isOpen={activeModal === "autores"} onClose={() => setActiveModal(null)} title="Autores">
        <AuthorsList books={allBooks} />
      </Modal>

      <Modal isOpen={activeModal === "generos"} onClose={() => setActiveModal(null)} title="Gêneros">
        <GenresList books={allBooks} />
      </Modal>

      <Modal isOpen={activeModal === "posts"} onClose={() => setActiveModal(null)} title="Seus Posts">
        <PostsList posts={allPosts} />
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
                  key={author.autor}
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
                    <p className="font-medium">{author.autor}</p>
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

// Lista de posts
function PostsList({ posts }: { posts: CommunityPost[] }) {
  if (posts.length === 0) {
    return <p className="text-muted-foreground text-center py-4">Nenhum post encontrado.</p>;
  }

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
      {posts.map((post) => (
        <div 
          key={post.id} 
          className="p-4 rounded-lg bg-muted/50 space-y-3"
        >
          {/* Livro associado */}
          {post.book_title && (
            <div className="flex items-center gap-3 pb-3 border-b border-border/50">
              {post.book_cover_url ? (
                <img 
                  src={post.book_cover_url} 
                  alt={post.book_title} 
                  className="w-10 h-14 object-cover rounded shadow-sm" 
                />
              ) : (
                <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                  <Book className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{post.book_title}</p>
                <p className="text-xs text-muted-foreground truncate">{post.book_author}</p>
              </div>
            </div>
          )}

          {/* Conteúdo do post */}
          <p className="text-sm">{post.content}</p>

          {/* Rodapé */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {new Date(post.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
            <div className="flex items-center gap-3">
              <span>❤️ {post.likes_count}</span>
              <span>💬 {post.comments_count}</span>
            </div>
          </div>
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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      <Skeleton className="h-80 w-full" />
    </div>
  );
}

