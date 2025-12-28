"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BookForm } from "@/components/features/book-form";
import { Skeleton } from "@/components/ui";
import type { Book } from "@/types/database";

export default function EditarLivroPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBook();
  }, [params.id]);

  const fetchBook = async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setBook(data);
    } catch (error) {
      console.error("Error fetching book:", error);
      router.push("/estante");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!book) {
    return null;
  }

  return <BookForm book={book} mode="edit" />;
}

