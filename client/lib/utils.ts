import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Backend API base URL for generate-report. Reads NEXT_PUBLIC_API_URL (set in Vercel / .env.local). */
export function getReportApiBaseUrl(): string {
  const env = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL?.trim() : ""
  if (!env) {
    console.warn("NEXT_PUBLIC_API_URL is not set – backend calls will fail.")
    return ""
  }
  const trimmed = env.replace(/\/+$/, "")
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  return `https://${trimmed}`
}
