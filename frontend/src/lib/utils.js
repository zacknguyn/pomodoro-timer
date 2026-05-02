import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Parse a SQLite datetime string (with or without Z/T) as UTC */
export const parseUTC = (str) => new Date(str.replace(' ', 'T').replace(/Z?$/, 'Z'));
