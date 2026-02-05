 import { useState, useCallback } from "react";
 import { checkRateLimit, resetRateLimit } from "@/lib/security";
 import { useToast } from "@/hooks/use-toast";
 
 interface UseRateLimitOptions {
   key: string;
   maxRequests?: number;
   windowMs?: number;
   onLimitExceeded?: (remainingTime: number) => void;
 }
 
 interface UseRateLimitReturn {
   checkLimit: () => boolean;
   reset: () => void;
   isLimited: boolean;
   remainingTime: number;
   remainingRequests: number;
 }
 
 /**
  * React hook for client-side rate limiting
  */
 export const useRateLimit = ({
   key,
   maxRequests = 5,
   windowMs = 60000,
   onLimitExceeded,
 }: UseRateLimitOptions): UseRateLimitReturn => {
   const { toast } = useToast();
   const [isLimited, setIsLimited] = useState(false);
   const [remainingTime, setRemainingTime] = useState(0);
   const [remainingRequests, setRemainingRequests] = useState(maxRequests);
 
   const checkLimit = useCallback((): boolean => {
     const result = checkRateLimit(key, maxRequests, windowMs);
     
     setIsLimited(!result.allowed);
     setRemainingTime(result.remainingTime);
     setRemainingRequests(result.remainingRequests);
 
     if (!result.allowed) {
       if (onLimitExceeded) {
         onLimitExceeded(result.remainingTime);
       } else {
         toast({
           title: "Too Many Requests",
           description: `Please wait ${result.remainingTime} seconds before trying again.`,
           variant: "destructive",
         });
       }
     }
 
     return result.allowed;
   }, [key, maxRequests, windowMs, onLimitExceeded, toast]);
 
   const reset = useCallback(() => {
     resetRateLimit(key);
     setIsLimited(false);
     setRemainingTime(0);
     setRemainingRequests(maxRequests);
   }, [key, maxRequests]);
 
   return {
     checkLimit,
     reset,
     isLimited,
     remainingTime,
     remainingRequests,
   };
 };