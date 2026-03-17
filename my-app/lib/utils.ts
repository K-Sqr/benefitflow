import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Backend API base URL for generate-report. Always an absolute Railway URL so the browser never resolves it relative to benefitflow.me. */
const RAILWAY_API_BASE = "https://hackathon-final-production.up.railway.app"

export function getReportApiBaseUrl(): string {
  const env = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL?.trim() : ""
  const base = env && env.includes("railway") ? env : RAILWAY_API_BASE
  const trimmed = base.replace(/\/+$/, "")
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed
  return `https://${trimmed}`
}
