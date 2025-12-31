"use client";

import { forwardRef, useState, useRef, useEffect, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange?: (e: { target: { value: string } }) => void;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, placeholder, value, onChange, disabled, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value || "");
    const containerRef = useRef<HTMLDivElement>(null);

    // Atualiza quando value muda externamente
    useEffect(() => {
      setSelectedValue(value as string || "");
    }, [value]);

    // Fecha dropdown ao clicar fora
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === selectedValue);
    const displayLabel = selectedOption?.label || placeholder || "Selecione...";

    const handleSelect = (optionValue: string) => {
      setSelectedValue(optionValue);
      setIsOpen(false);
      if (onChange) {
        onChange({ target: { value: optionValue } });
      }
    };

    return (
      <div ref={containerRef} className="relative w-full">
        {/* Hidden native select for form compatibility */}
        <select
          ref={ref}
          value={selectedValue}
          onChange={(e) => handleSelect(e.target.value)}
          className="sr-only"
          disabled={disabled}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Custom trigger button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors",
            "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            isOpen && "ring-2 ring-ring ring-offset-2",
            error && "border-destructive focus:ring-destructive",
            !selectedValue && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown 
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-input bg-card shadow-lg animate-in fade-in-0 zoom-in-95 duration-100">
            <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors",
                    "hover:bg-accent focus:bg-accent focus:outline-none",
                    selectedValue === option.value && "bg-accent/50 font-medium"
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {selectedValue === option.value && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="mt-1 text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
