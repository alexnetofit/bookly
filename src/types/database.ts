export type ReadingStatus = "nao_comecou" | "lendo" | "lido" | "desistido";

export type PlanType = "explorer" | "traveler" | "devourer" | null;

export interface BookSearchResult {
  id: string;
  title: string;
  authors: string[];
  cover_url: string | null;
  page_count: number | null;
  published_year: string | null;
  description: string | null;
  source: "google" | "openlibrary";
}

export interface BookSearchCache {
  id: string;
  query: string;
  results_json: BookSearchResult[];
  expires_at: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  plan: PlanType;
  subscription_expires_at: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  nome_do_livro: string;
  autor: string;
  numero_de_paginas: number;
  descricao: string | null;
  cover_url: string | null;
  rating: number | null;
  status_leitura: ReadingStatus;
  paginas_lidas: number;
  created_at: string;
  updated_at: string;
}

export interface AnnualGoal {
  id: string;
  user_id: string;
  year: number;
  goal_amount: number;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  book_id: string | null;
  book_title: string | null;
  book_author: string | null;
  book_cover_url: string | null;
  content: string;
  has_spoiler: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
  // Joins
  user_profile?: UserProfile;
}

export interface PostLike {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  // Joins
  user_profile?: UserProfile;
}

// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      users_profile: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "id" | "created_at">;
        Update: Partial<Omit<UserProfile, "id" | "created_at">>;
      };
      books: {
        Row: Book;
        Insert: Omit<Book, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Book, "id" | "created_at" | "updated_at">>;
      };
      annual_goals: {
        Row: AnnualGoal;
        Insert: Omit<AnnualGoal, "id" | "created_at">;
        Update: Partial<Omit<AnnualGoal, "id" | "created_at">>;
      };
      community_posts: {
        Row: CommunityPost;
        Insert: Omit<CommunityPost, "id" | "created_at" | "likes_count" | "comments_count">;
        Update: Partial<Omit<CommunityPost, "id" | "created_at">>;
      };
      post_likes: {
        Row: PostLike;
        Insert: Omit<PostLike, "id" | "created_at">;
        Update: never;
      };
      post_comments: {
        Row: PostComment;
        Insert: Omit<PostComment, "id" | "created_at">;
        Update: Partial<Omit<PostComment, "id" | "created_at">>;
      };
    };
  };
}

