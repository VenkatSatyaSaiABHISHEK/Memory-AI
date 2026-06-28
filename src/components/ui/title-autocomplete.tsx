"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface TitleAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const PREDEFINED_TITLES = [
  "Classwork",
  "Parent Meeting",
  "Parent Calling",
  "Student Interaction",
  "Meeting With",
  "Student Issue",
  "Project Work",
  "College Work",
];

export function TitleAutocomplete({
  value,
  onChange,
  placeholder = "Name your memory...",
  className,
  required = false,
}: TitleAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>(PREDEFINED_TITLES);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on input value
  useEffect(() => {
    if (!value) {
      setFilteredOptions(PREDEFINED_TITLES);
    } else {
      const filtered = PREDEFINED_TITLES.filter((item) =>
        item.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
    setActiveIndex(-1);
  }, [value]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        e.preventDefault();
        onChange(filteredOptions[activeIndex]);
        setIsOpen(false);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= filteredOptions.length ? 0 : prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 < 0 ? filteredOptions.length - 1 : prev - 1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        type="text"
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-11 bg-neutral-50/50 dark:bg-neutral-900/40 border-neutral-100 dark:border-neutral-900 rounded-xl text-xs placeholder:text-neutral-450 focus-visible:ring-0 focus-visible:border-neutral-200 dark:focus-visible:border-neutral-800 shadow-none text-neutral-800 dark:text-neutral-200 font-semibold w-full",
          className
        )}
      />
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white/90 dark:bg-neutral-950/90 border border-neutral-100 dark:border-neutral-900 rounded-2xl premium-shadow-md z-50 backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-1.5 space-y-0.5">
            {filteredOptions.map((option, idx) => (
              <button
                key={option}
                type="button"
                onClick={() => handleSelect(option)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs rounded-xl transition-colors font-medium outline-none cursor-pointer",
                  idx === activeIndex
                    ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 hover:text-neutral-900 dark:hover:text-white"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
