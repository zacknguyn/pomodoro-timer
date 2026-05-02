import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Parse a datetime string as UTC. Handles SQLite format (space separator, no Z) and ISO 8601. */
export const parseUTC = (str) => {
  if (!str) return new Date(NaN);
  // Already a proper ISO string (has T and timezone info) — parse directly
  if (str.includes('T')) return new Date(str);
  // SQLite format: "YYYY-MM-DD HH:MM:SS" — treat as UTC
  return new Date(str.replace(' ', 'T') + 'Z');
};
