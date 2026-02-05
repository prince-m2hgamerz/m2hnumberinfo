 import DOMPurify from "dompurify";
 
 // ==========================================
 // Input Sanitization & Validation
 // ==========================================
 
 /**
  * Sanitize HTML content to prevent XSS attacks
  */
 export const sanitizeHtml = (dirty: string): string => {
   return DOMPurify.sanitize(dirty, {
     ALLOWED_TAGS: [], // Strip all HTML tags by default
     ALLOWED_ATTR: [],
   });
 };
 
 /**
  * Sanitize HTML content allowing safe formatting tags
  */
 export const sanitizeHtmlWithFormatting = (dirty: string): string => {
   return DOMPurify.sanitize(dirty, {
     ALLOWED_TAGS: ["b", "i", "em", "strong", "br", "p"],
     ALLOWED_ATTR: [],
   });
 };
 
 /**
  * Sanitize text input - removes HTML and limits length
  */
 export const sanitizeText = (input: string, maxLength: number = 500): string => {
   if (typeof input !== "string") return "";
   return sanitizeHtml(input).trim().slice(0, maxLength);
 };
 
 /**
  * Validate and sanitize email
  */
 export const sanitizeEmail = (email: string): string | null => {
   if (typeof email !== "string") return null;
   const sanitized = sanitizeText(email, 255).toLowerCase();
   const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
   return emailRegex.test(sanitized) ? sanitized : null;
 };
 
 /**
  * Validate phone number (10 digits for India)
  */
 export const validatePhoneNumber = (phone: string): boolean => {
   if (typeof phone !== "string") return false;
   return /^\d{10}$/.test(phone.trim());
 };
 
 /**
  * Sanitize phone number input
  */
 export const sanitizePhoneNumber = (phone: string): string => {
   if (typeof phone !== "string") return "";
   return phone.replace(/\D/g, "").slice(0, 10);
 };
 
 /**
  * Validate UUID format
  */
 export const validateUUID = (id: string): boolean => {
   if (typeof id !== "string") return false;
   const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   return uuidRegex.test(id);
 };
 
 /**
  * Sanitize URL to prevent javascript: and data: attacks
  */
 export const sanitizeUrl = (url: string): string | null => {
   if (typeof url !== "string") return null;
   const trimmed = url.trim();
   
   // Block dangerous protocols
   const dangerousProtocols = ["javascript:", "data:", "vbscript:", "file:"];
   const lowerUrl = trimmed.toLowerCase();
   
   for (const protocol of dangerousProtocols) {
     if (lowerUrl.startsWith(protocol)) return null;
   }
   
   // Allow http, https, mailto, tel
   if (
     lowerUrl.startsWith("http://") ||
     lowerUrl.startsWith("https://") ||
     lowerUrl.startsWith("mailto:") ||
     lowerUrl.startsWith("tel:") ||
     lowerUrl.startsWith("/") // Relative URLs
   ) {
     return trimmed;
   }
   
   return null;
 };
 
 // ==========================================
 // CSRF Protection
 // ==========================================
 
 const CSRF_TOKEN_KEY = "csrf_token";
 
 /**
  * Generate a CSRF token
  */
 export const generateCSRFToken = (): string => {
   const token = crypto.randomUUID();
   sessionStorage.setItem(CSRF_TOKEN_KEY, token);
   return token;
 };
 
 /**
  * Get current CSRF token or generate new one
  */
 export const getCSRFToken = (): string => {
   let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
   if (!token) {
     token = generateCSRFToken();
   }
   return token;
 };
 
 /**
  * Validate CSRF token
  */
 export const validateCSRFToken = (token: string): boolean => {
   const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
   return storedToken === token && token.length > 0;
 };
 
 // ==========================================
 // Rate Limiting (Client-side)
 // ==========================================
 
 interface RateLimitEntry {
   count: number;
   resetAt: number;
 }
 
 const rateLimitStore = new Map<string, RateLimitEntry>();
 
 /**
  * Client-side rate limiting
  * @param key Unique identifier for the action
  * @param maxRequests Maximum requests allowed
  * @param windowMs Time window in milliseconds
  * @returns Object with allowed status and remaining time
  */
 export const checkRateLimit = (
   key: string,
   maxRequests: number = 5,
   windowMs: number = 60000
 ): { allowed: boolean; remainingTime: number; remainingRequests: number } => {
   const now = Date.now();
   const entry = rateLimitStore.get(key);
 
   if (!entry || now > entry.resetAt) {
     // New window
     rateLimitStore.set(key, {
       count: 1,
       resetAt: now + windowMs,
     });
     return { allowed: true, remainingTime: 0, remainingRequests: maxRequests - 1 };
   }
 
   if (entry.count >= maxRequests) {
     const remainingTime = Math.ceil((entry.resetAt - now) / 1000);
     return { allowed: false, remainingTime, remainingRequests: 0 };
   }
 
   entry.count++;
   return {
     allowed: true,
     remainingTime: 0,
     remainingRequests: maxRequests - entry.count,
   };
 };
 
 /**
  * Reset rate limit for a key
  */
 export const resetRateLimit = (key: string): void => {
   rateLimitStore.delete(key);
 };
 
 // ==========================================
 // Security Headers Check
 // ==========================================
 
 /**
  * Add security-related meta tags to document head
  * Note: Real security headers should be set server-side
  */
 export const addSecurityMetaTags = (): void => {
   // Content Security Policy (basic)
   const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
   if (!existingCSP) {
     const csp = document.createElement("meta");
     csp.httpEquiv = "Content-Security-Policy";
     csp.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; frame-ancestors 'self';";
     document.head.appendChild(csp);
   }
 
   // X-Content-Type-Options
   const existingXCTO = document.querySelector('meta[http-equiv="X-Content-Type-Options"]');
   if (!existingXCTO) {
     const xcto = document.createElement("meta");
     xcto.httpEquiv = "X-Content-Type-Options";
     xcto.content = "nosniff";
     document.head.appendChild(xcto);
   }
 
   // Referrer Policy
   const existingRP = document.querySelector('meta[name="referrer"]');
   if (!existingRP) {
     const rp = document.createElement("meta");
     rp.name = "referrer";
     rp.content = "strict-origin-when-cross-origin";
     document.head.appendChild(rp);
   }
 };
 
 // ==========================================
 // Secure Storage
 // ==========================================
 
 /**
  * Securely store data with expiration
  */
 export const secureStore = {
   set: (key: string, value: unknown, expiresInMs?: number): void => {
     const data = {
       value,
       expires: expiresInMs ? Date.now() + expiresInMs : null,
     };
     try {
       sessionStorage.setItem(key, JSON.stringify(data));
     } catch {
       console.warn("Failed to store data securely");
     }
   },
 
   get: <T>(key: string): T | null => {
     try {
       const item = sessionStorage.getItem(key);
       if (!item) return null;
 
       const data = JSON.parse(item);
       if (data.expires && Date.now() > data.expires) {
         sessionStorage.removeItem(key);
         return null;
       }
 
       return data.value as T;
     } catch {
       return null;
     }
   },
 
   remove: (key: string): void => {
     sessionStorage.removeItem(key);
   },
 };