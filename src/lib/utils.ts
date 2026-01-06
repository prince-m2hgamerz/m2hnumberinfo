import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ===============================
   Aadhaar Lookup Helpers
================================ */

export interface AadhaarRecord {
  name: string;
  aadhar_number: string;
}

export interface AadhaarApiResponse {
  success: boolean;
  count: number;
  records: AadhaarRecord[];
}

/**
 * Fetch Aadhaar info by mobile number
 * FULL Aadhaar returned (no masking)
 */
export async function fetchAadhaarInfo(mobile: string): Promise<AadhaarRecord[]> {
  const res = await fetch(`https://aadharinfo.m2hgamerz.workers.dev/?num=${mobile}`);

  if (!res.ok) return [];

  const data: AadhaarApiResponse = await res.json();
  if (!data.success || !Array.isArray(data.records)) return [];

  return data.records;
}
