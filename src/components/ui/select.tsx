"use client";

import { forwardRef, useState, useRef, useEffect, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, Search } from "lucide-react";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange?: (e: { target: { value: string } }) => void;
  searchable?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, placeholder, value, onChange, disabled, searchable = true, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState(value || "");
    const [searchQuery, setSearchQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Atualiza quando value muda externamente
    useEffect(() => {
      setSelectedValue(value as string || "");
    }, [value]);

    // Foca no input de busca quando abre
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
      if (!isOpen) {
        setSearchQuery("");
      }
    }, [isOpen, searchable]);

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

    // Filtra opções baseado na busca
    const filteredOptions = options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.value === selectedValue);
    const displayLabel = selectedOption?.label || placeholder || "Selecione...";

    const handleSelect = (optionValue: string) => {
      setSelectedValue(optionValue);
      setIsOpen(false);
      setSearchQuery("");
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
            {/* Search input */}
            {searchable && options.length > 5 && (
              <div className="p-2 border-b border-input">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full h-8 pl-8 pr-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado
                </div>
              ) : (
                filteredOptions.map((option) => (
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
                ))
              )}
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
