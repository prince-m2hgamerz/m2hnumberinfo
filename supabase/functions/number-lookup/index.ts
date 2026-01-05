import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, phoneNumber } = await req.json();

    console.log(`Number lookup request - User: ${userId}, Phone: ${phoneNumber}`);

    if (!userId || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or phoneNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number format
    if (!/^\d{10}$/.test(phoneNumber)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists and is not banned
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (user.banned) {
      return new Response(
        JSON.stringify({ error: 'User is banned' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (user.credits < 1) {
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
    console.log(`Calling Number API: ${apiUrl}`);

    const apiResponse = await fetch(apiUrl);
    const apiData = await apiResponse.json();

    console.log('API Response:', JSON.stringify(apiData));

    if (!apiData.success || !apiData.result || apiData.result.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No data found for this number',
          success: false 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the response - get the first result that matches the searched number
    const results = apiData.result;
    const primaryResult = results.find((r: any) => r.mobile === phoneNumber) || results[0];

    // Format address - replace ! with spaces/commas
    const formatAddress = (addr: string | null) => {
      if (!addr) return 'Not available';
      return addr.replace(/!+/g, ', ').replace(/^,\s*|,\s*$/g, '').replace(/,\s*,/g, ',');
    };

    // Deduct credit
    await supabase
      .from('users')
      .update({ credits: user.credits - 1 })
      .eq('id', userId);

    // Save to search history
    await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        name: primaryResult.name || null,
        address: formatAddress(primaryResult.address),
        circle: primaryResult.circle || null,
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

    // Return all results for display
    const formattedResults = results.map((r: any) => ({
      name: r.name || 'Not available',
      mobile: r.mobile || phoneNumber,
      fatherName: r.father_name || null,
      address: formatAddress(r.address),
      altMobile: r.alt_mobile || null,
      circle: r.circle || 'Not available',
      email: r.email || null,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        resultCount: apiData.result_count || results.length,
        data: formattedResults[0], // Primary result
        allResults: formattedResults, // All results
        remainingCredits: user.credits - 1,
        meta: {
          processingTime: apiData.meta?.processing_time_ms,
          timestamp: apiData.meta?.timestamp,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in number-lookup function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
