// Sistema central de cache em memória
// Gerencia todos os caches do app e permite invalidação global

import type { DashboardData, AnnualGoal, YearlyReadingStats } from "@/types/database";

// ==========================================
// TIPOS
// ==========================================

interface DashboardCache {
  userId: string;
  year: number;
  data: DashboardData;
  timestamp: number;
}

interface YearGoalData {
  goal: AnnualGoal | null;
  yearly: YearlyReadingStats | null;
}

interface MetasCache {
  userId: string;
  yearData: Record<number, YearGoalData>;
  allYearlyStats: YearlyReadingStats[];
  allGoals: AnnualGoal[];
  timestamp: number;
}

// ==========================================
// CACHE STORAGE
// ==========================================

let dashboardCache: DashboardCache | null = null;
let metasCache: MetasCache | null = null;

// TTLs - Com dados pré-agregados, podemos aumentar
export const DASHBOARD_CACHE_TTL = 10 * 60 * 1000; // 10 minutos
export const METAS_CACHE_TTL = 10 * 60 * 1000; // 10 minutos

// ==========================================
// DASHBOARD CACHE
// ==========================================

export function getDashboardCache(userId: string, year: number): DashboardData | null {
  if (!dashboardCache) return null;
  if (dashboardCache.userId !== userId) return null;
  if (dashboardCache.year !== year) return null;
  if (Date.now() - dashboardCache.timestamp > DASHBOARD_CACHE_TTL) return null;
  return dashboardCache.data;
}

export function setDashboardCache(userId: string, year: number, data: DashboardData): void {
  dashboardCache = {
    userId,
    year,
    data,
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
