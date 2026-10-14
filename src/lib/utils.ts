import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const IST_TIMEZONE = "Asia/Kolkata";

export function getFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first || "there";
}

/** Morning / afternoon / evening by India Standard Time (Asia/Kolkata). */
export function getIndianTimeGreeting(date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(date),
  );

  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Optimizes Cloudinary URLs by injecting on-the-fly delivery transformations (format, quality, sizing)
 * to save maximum bandwidth and loading time on the frontend.
 */
export function optimizeCloudinaryUrl(url: string | null | undefined, width = 128, height = 128): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com")) return url;
  
  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) return url;
  
  const prefix = url.substring(0, uploadIndex + 8);
  const suffix = url.substring(uploadIndex + 8);
  
  // Prevent duplicate transformations
  if (suffix.match(/^(f_auto|q_auto|w_|h_)/)) {
    return url;
  }
  
  return `${prefix}f_auto,q_auto,w_${width},h_${height},c_limit/${suffix}`;
}
