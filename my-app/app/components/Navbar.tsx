"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useLanguage, LANGUAGES } from "@/app/context/LanguageContext";

export default function Navbar() {
  const { language: lang, setLanguage: setLang } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#F9F8F3]/95 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[#E5E7EB]">
      {/* Left: Logo + Name (Bold, Black) */}
      <div className="flex items-center gap-2 cursor-pointer">
        <div className="h-8 w-8 rounded-full bg-[#1A5D3B] flex items-center justify-center text-white text-xs">
          💬
        </div>
        <span className="text-xl font-bold tracking-tight text-[#111827]">
          BenefitFlow
        </span>
      </div>

      {/* Center: Hidden for demo focus */}
      <div className="hidden md:block flex-1" aria-hidden />

      {/* Right: Language Toggle + Sign In (Ghost) */}
      <div className="flex items-center gap-4">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[15px] font-medium text-[#111827] hover:opacity-80 transition-opacity rounded-md px-2 py-1.5"
          >
            {lang.label}
            <span className="text-xs text-[#111827]">▾</span>
          </button>
          {dropdownOpen && (
            <div
              className="absolute right-0 top-full mt-1 py-1 min-w-[140px] rounded-lg border bg-white shadow-lg z-50 border-[#E5E7EB]"
              role="listbox"
            >
              {LANGUAGES.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  role="option"
                  aria-selected={lang.code === option.code}
                  onClick={() => {
                    setLang(option);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm font-medium transition-colors rounded-md",
                    lang.code === option.code
                      ? "bg-[#E5E7EB]/50 text-[#111827]"
                      : "text-[#111827] hover:bg-[#E5E7EB]/30",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
