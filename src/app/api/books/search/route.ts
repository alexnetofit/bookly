import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { BookSearchResult } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const CACHE_TTL_DAYS = 7;
const MAX_RESULTS = 10;

// Normalize Google Books response
function normalizeGoogleBook(item: any): BookSearchResult {
  const volumeInfo = item.volumeInfo || {};
  return {
    id: item.id,
    title: volumeInfo.title || "Sem título",
    authors: volumeInfo.authors || [],
    cover_url: volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:") || null,
    page_count: volumeInfo.pageCount || null,
    published_year: volumeInfo.publishedDate?.split("-")[0] || null,
    description: volumeInfo.description?.slice(0, 500) || null,
    source: "google",
  };
}

// Normalize Open Library response
function normalizeOpenLibraryBook(doc: any): BookSearchResult {
  const coverId = doc.cover_i;
  return {
    id: doc.key || `ol-${doc.cover_i || Math.random()}`,
    title: doc.title || "Sem título",
    authors: doc.author_name || [],
    cover_url: coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
      : null,
    page_count: doc.number_of_pages_median || null,
    published_year: doc.first_publish_year?.toString() || null,
    description: null, // Open Library search doesn't return descriptions
    source: "openlibrary",
  };
}

// Fetch from Google Books API
async function searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}&maxResults=${MAX_RESULTS}&langRestrict=pt`;
    
    const response = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!response.ok) {
      console.error("Google Books API error:", response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }
    
    return data.items.map(normalizeGoogleBook);
  } catch (error) {
    console.error("Error fetching from Google Books:", error);
    return [];
  }
}

// Fetch from Open Library API
async function searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
      query
    )}&limit=${MAX_RESULTS}&language=por`;
    
    const response = await fetch(url, { next: { revalidate: 3600 } });
    
    if (!response.ok) {
      console.error("Open Library API error:", response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.docs || !Array.isArray(data.docs)) {
      return [];
    }
    
    return data.docs.map(normalizeOpenLibraryBook);
  } catch (error) {
    console.error("Error fetching from Open Library:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim().toLowerCase();

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Query deve ter pelo menos 2 caracteres" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check cache first
  const { data: cached } = await supabase
    .from("book_search_cache")
    .select("results_json, expires_at")
    .eq("query", query)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    return NextResponse.json({ results: cached.results_json, cached: true });
  }

  // Fetch from Google Books first
  let results = await searchGoogleBooks(query);

  // If results are insufficient, use Open Library as fallback
  if (results.length < 3) {
    const openLibraryResults = await searchOpenLibrary(query);
    
    // Merge results, avoiding duplicates by title similarity
    const existingTitles = new Set(
      results.map((r) => r.title.toLowerCase())
    );
    
    for (const book of openLibraryResults) {
      if (!existingTitles.has(book.title.toLowerCase())) {
        results.push(book);
        existingTitles.add(book.title.toLowerCase());
      }
    }
  }

  // Limit to MAX_RESULTS
  results = results.slice(0, MAX_RESULTS);

  // Save to cache
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

  await supabase.from("book_search_cache").upsert(
    {
      query,
      results_json: results,
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "query" }
  );

  return NextResponse.json({ results, cached: false });
}


