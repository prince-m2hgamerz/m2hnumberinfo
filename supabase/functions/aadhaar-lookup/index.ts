 import "https://deno.land/x/xhr@0.1.0/mod.ts";
 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 const RATE_LIMIT_MAX_REQUESTS = 5;
 const RATE_LIMIT_WINDOW_MS = 60000;
 
 const validateUUID = (id: string): boolean => {
   const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
   return typeof id === 'string' && uuidRegex.test(id);
 };
 
 const validatePhoneNumber = (phone: string): boolean => {
   return typeof phone === 'string' && /^\d{10}$/.test(phone);
 };
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   const requestId = crypto.randomUUID().slice(0, 8);
   console.log(`[${requestId}] Aadhaar lookup request started`);
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const body = await req.json();
     const { userId, phoneNumber } = body;
 
     if (!userId || !validateUUID(userId)) {
       console.log(`[${requestId}] Invalid userId format`);
       return new Response(
         JSON.stringify({ error: 'Invalid request' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     if (!phoneNumber || !validatePhoneNumber(phoneNumber)) {
       console.log(`[${requestId}] Invalid phone number format`);
       return new Response(
         JSON.stringify({ error: 'Invalid phone number format. Please enter exactly 10 digits.' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log(`[${requestId}] User: ${userId.slice(0, 8)}..., Phone: ${phoneNumber.slice(0, 4)}****`);
 
     // Check if user exists and is not banned
     const { data: user, error: userError } = await supabase
       .from('users')
       .select('*')
       .eq('id', userId)
       .single();
 
     if (userError || !user) {
       console.log(`[${requestId}] User not found`);
       return new Response(
         JSON.stringify({ error: 'User not found' }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     if (user.banned) {
       console.log(`[${requestId}] Banned user attempted lookup`);
       return new Response(
         JSON.stringify({ error: 'Account is banned' }),
         { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     if (user.credits < 1) {
       console.log(`[${requestId}] Insufficient credits`);
       return new Response(
         JSON.stringify({ error: 'Insufficient credits' }),
         { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Check rate limit
     const now = new Date();
     const { data: rateLimit } = await supabase
       .from('rate_limits')
       .select('*')
       .eq('user_id', userId)
       .maybeSingle();
 
     if (rateLimit) {
       const windowStart = new Date(rateLimit.window_start);
       const timeDiff = now.getTime() - windowStart.getTime();
 
       if (timeDiff < RATE_LIMIT_WINDOW_MS) {
         if (rateLimit.request_count >= RATE_LIMIT_MAX_REQUESTS) {
           const remainingTime = Math.ceil((RATE_LIMIT_WINDOW_MS - timeDiff) / 1000);
           console.log(`[${requestId}] Rate limit exceeded, wait ${remainingTime}s`);
           return new Response(
             JSON.stringify({ 
               error: 'Rate limit exceeded', 
               remainingTime,
               message: `Please wait ${remainingTime} seconds before trying again` 
             }),
             { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
           );
         }
         await supabase
           .from('rate_limits')
           .update({ request_count: rateLimit.request_count + 1 })
           .eq('user_id', userId);
       } else {
         await supabase
           .from('rate_limits')
           .update({ request_count: 1, window_start: now.toISOString() })
           .eq('user_id', userId);
       }
     } else {
       await supabase
         .from('rate_limits')
         .insert({ user_id: userId, request_count: 1, window_start: now.toISOString() });
     }
 
     // Call the Aadhaar lookup API
     const apiUrl = `https://aadharinfo.m2hgamerz.workers.dev/?num=${phoneNumber}`;
     console.log(`[${requestId}] Calling external Aadhaar API`);
 
     const apiResponse = await fetch(apiUrl);
     const apiData = await apiResponse.json();
 
     console.log(`[${requestId}] Aadhaar API response received, success: ${apiData.success}`);
 
     const records = apiData.records || apiData.data || (Array.isArray(apiData) ? apiData : null);
     const finalRecords = Array.isArray(records) ? records : records ? [records] : [];
 
     if (!apiData.success && finalRecords.length === 0) {
       console.log(`[${requestId}] No Aadhaar data found - NOT deducting credits`);
       return new Response(
         JSON.stringify({ 
           error: 'No Aadhaar data found for this number',
           success: false,
           noDeduction: true,
           remainingCredits: user.credits
         }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Deduct credit only if data was found
     await supabase
       .from('users')
       .update({ credits: user.credits - 1 })
       .eq('id', userId);
 
     // Update global stats
     const { data: stats } = await supabase
       .from('stats')
       .select('*')
       .single();
 
     if (stats) {
       await supabase
         .from('stats')
         .update({ total_checks: stats.total_checks + 1 })
         .eq('id', stats.id);
     }
 
     console.log(`[${requestId}] Aadhaar lookup successful, ${finalRecords.length} records, credits: ${user.credits - 1}`);
 
     return new Response(
       JSON.stringify({
         success: true,
         records: finalRecords,
         remainingCredits: user.credits - 1,
       }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error('Error in aadhaar-lookup function:', error);
     return new Response(
       JSON.stringify({ error: 'Lookup failed. Please try again.' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });