// Sistema central de cache em memória
// Gerencia todos os caches do app e permite invalidação global

import type { AnnualGoal, Book, CommunityPost } from "@/types/database";

// ==========================================
// TIPOS
// ==========================================

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

interface DashboardCache {
  userId: string;
  stats: BookStats | null;
  goal: AnnualGoal | null;
  topAuthors: AuthorRanking[];
  allBooks: Book[];
  allPosts: CommunityPost[];
  timestamp: number;
}

interface YearCacheData {
  goal: AnnualGoal | null;
  booksRead: number;
}

interface HistoryYear {
  year: number;
  goal: number;
  booksRead: number;
  achieved: boolean;
}

interface MetasCache {
  userId: string;
  yearData: Record<number, YearCacheData>;
  history: HistoryYear[];
  timestamp: number;
}

// ==========================================
// CACHE STORAGE
// ==========================================

let dashboardCache: DashboardCache | null = null;
let metasCache: MetasCache | null = null;

// TTLs
export const DASHBOARD_CACHE_TTL = 2 * 60 * 1000; // 2 minutos
export const METAS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// ==========================================
// DASHBOARD CACHE
// ==========================================

export function getDashboardCache(userId: string): DashboardCache | null {
  if (!dashboardCache) return null;
  if (dashboardCache.userId !== userId) return null;
  if (Date.now() - dashboardCache.timestamp > DASHBOARD_CACHE_TTL) return null;
  return dashboardCache;
}

export function setDashboardCache(data: Omit<DashboardCache, "timestamp">): void {
  dashboardCache = {
    ...data,
    timestamp: Date.now(),
  };
}

export function invalidateDashboardCache(): void {
  dashboardCache = null;
}

// ==========================================
// METAS CACHE
// ==========================================

export function getMetasCache(userId: string): MetasCache | null {
  if (!metasCache) return null;
  if (metasCache.userId !== userId) return null;
  if (Date.now() - metasCache.timestamp > METAS_CACHE_TTL) return null;
  return metasCache;
}

export function setMetasCache(data: Omit<MetasCache, "timestamp">): void {
  metasCache = {
    ...data,
    timestamp: Date.now(),
  };
}

export function invalidateMetasCache(): void {
  metasCache = null;
}

// ==========================================
// GLOBAL CACHE CONTROL
// ==========================================

/**
 * Limpa TODOS os caches do app
 * Deve ser chamado no logout
 */
export function clearAllCaches(): void {
  dashboardCache = null;
  metasCache = null;
}

/**
 * Invalida caches que dependem de dados de livros
 * Deve ser chamado ao criar/editar/excluir livros
 */
export function invalidateBookRelatedCaches(): void {
  invalidateDashboardCache();
  invalidateMetasCache();
}

