"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative z-10 w-full max-w-lg max-h-[90vh] overflow-auto rounded-xl bg-card border shadow-xl animate-fade-in",
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-accent transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export { Modal };

