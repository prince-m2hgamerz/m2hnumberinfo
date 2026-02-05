import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

// Security: Input validation helpers
const validateUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof id === 'string' && uuidRegex.test(id);
};

const validatePhoneNumber = (phone: string): boolean => {
  // Only allow exactly 10 digits for Indian phone numbers
  return typeof phone === 'string' && /^\d{10}$/.test(phone);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] Number lookup request started`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { userId, phoneNumber } = body;

    // Security: Validate userId format
    if (!userId || !validateUUID(userId)) {
      console.log(`[${requestId}] Invalid userId format`);
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security: Validate phone number format
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
        // Increment count
        await supabase
          .from('rate_limits')
          .update({ request_count: rateLimit.request_count + 1 })
          .eq('user_id', userId);
      } else {
        // Reset window
        await supabase
          .from('rate_limits')
          .update({ request_count: 1, window_start: now.toISOString() })
          .eq('user_id', userId);
      }
    } else {
      // Create new rate limit entry
      await supabase
        .from('rate_limits')
        .insert({ user_id: userId, request_count: 1, window_start: now.toISOString() });
    }

    // Call the number lookup API
    const apiUrl = `https://numberinfo.m2hgamerz.workers.dev/?num=${phoneNumber}&key=pro`;
    console.log(`[${requestId}] Calling external API`);

    const apiResponse = await fetch(apiUrl);
    const apiData = await apiResponse.json();

    console.log(`[${requestId}] API response received, success: ${apiData.success}`);

    // Ensure result is an array
    const resultArray = Array.isArray(apiData.result) ? apiData.result : 
                        apiData.result ? [apiData.result] : [];

    // Check if we have valid results with actual data (not just "Not available")
    const hasValidData = (result: any): boolean => {
      if (!result) return false;
      const name = result.name?.toLowerCase?.() || '';
      const address = result.address?.toLowerCase?.() || '';
      // Check if name and address are meaningful (not empty/not available)
      const invalidValues = ['not available', 'n/a', 'na', 'null', 'undefined', ''];
      const isNameValid = name && !invalidValues.includes(name.trim());
      const isAddressValid = address && !invalidValues.includes(address.trim());
      return isNameValid || isAddressValid;
    };

    const validResults = resultArray.filter(hasValidData);

    if (!apiData.success || resultArray.length === 0 || validResults.length === 0) {
      console.log(`[${requestId}] No data found - NOT deducting credits`);
      // Decrement the rate limit counter since no valid result was found
      if (rateLimit) {
        const windowStart = new Date(rateLimit.window_start);
        const timeDiff = now.getTime() - windowStart.getTime();
        if (timeDiff < RATE_LIMIT_WINDOW_MS && rateLimit.request_count > 0) {
          await supabase
            .from('rate_limits')
            .update({ request_count: rateLimit.request_count })
            .eq('user_id', userId);
        }
      }
      // Return 200 with success: false to avoid error handling issues
      return new Response(
        JSON.stringify({ 
          error: 'No valid data found for this number',
          success: false,
          noDeduction: true,
          remainingCredits: user.credits
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the response - use only valid results
    const results = validResults;
    const primaryResult = results.find((r: any) => r.mobile === phoneNumber) || results[0];

    // Security: Sanitize output - format address safely
    const formatAddress = (addr: string | null) => {
      if (!addr || typeof addr !== 'string') return 'Not available';
      // Remove potentially harmful characters and format
      return addr
        .replace(/[<>]/g, '')
        .replace(/!+/g, ', ')
        .replace(/^,\s*|,\s*$/g, '')
        .replace(/,\s*,/g, ',')
        .slice(0, 500); // Limit length
    };

    const sanitizeName = (name: string | null) => {
      if (!name || typeof name !== 'string') return 'Not available';
      return name.replace(/[<>]/g, '').slice(0, 200);
    };

    // Deduct credit
    await supabase
      .from('users')
      .update({ credits: user.credits - 1 })
      .eq('id', userId);

    // Save to search history with sanitized data
    await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        name: sanitizeName(primaryResult.name),
        address: formatAddress(primaryResult.address),
        circle: primaryResult.circle ? String(primaryResult.circle).slice(0, 100) : null,
      });

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

    // Return all results for display with sanitized data
    const formattedResults = results.map((r: any) => ({
      name: sanitizeName(r.name),
      mobile: String(r.mobile || phoneNumber).slice(0, 15),
      fatherName: r.father_name ? sanitizeName(r.father_name) : null,
      address: formatAddress(r.address),
      altMobile: r.alt_mobile ? String(r.alt_mobile).slice(0, 15) : null,
      circle: r.circle ? String(r.circle).slice(0, 100) : 'Not available',
      email: r.email ? String(r.email).slice(0, 100) : null,
    }));

    console.log(`[${requestId}] Lookup successful, ${formattedResults.length} results, credits: ${user.credits - 1}`);

    return new Response(
      JSON.stringify({
        success: true,
        resultCount: apiData.result_count || results.length,
        data: formattedResults[0],
        allResults: formattedResults,
        remainingCredits: user.credits - 1,
        meta: {
          processingTime: apiData.meta?.processing_time_ms,
          timestamp: new Date().toISOString(),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in number-lookup function:', error);
    return new Response(
      JSON.stringify({ error: 'Lookup failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
