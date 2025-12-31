"use client";

import { cn } from "@/lib/utils";
import { Star, StarHalf } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

function StarRating({ value, onChange, readonly = false, size = "md" }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
    xl: "h-8 w-8",
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, star: number) => {
    if (readonly) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    
    setHoverValue(isHalf ? star - 0.5 : star);
  };

  const handleStarClick = (e: React.MouseEvent<HTMLButtonElement>, star: number) => {
    if (readonly) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    
    handleClick(isHalf ? star - 0.5 : star);
  };

  const displayValue = hoverValue || value;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = displayValue >= star;
        const isHalf = !isFull && displayValue >= star - 0.5;

        return (
          <button
            key={star}
            type="button"
            onClick={(e) => handleStarClick(e, star)}
            onMouseMove={(e) => handleMouseMove(e, star)}
            onMouseLeave={() => !readonly && setHoverValue(0)}
            disabled={readonly}
            className={cn(
              "relative transition-transform",
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
            )}
          >
            {/* Estrela de fundo (vazia) */}
            <Star
              className={cn(
                sizes[size],
                "fill-transparent text-muted-foreground/40"
              )}
            />
            
            {/* Estrela preenchida (inteira ou meia) */}
            {(isFull || isHalf) && (
              <div className="absolute inset-0">
                {isFull ? (
                  <Star
                    className={cn(
                      sizes[size],
                      "fill-yellow-400 text-yellow-400"
                    )}
                  />
                ) : (
                  <div className="relative">
                    <StarHalf
                      className={cn(
                        sizes[size],
                        "fill-yellow-400 text-yellow-400"
                      )}
                    />
                  </div>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { StarRating };
