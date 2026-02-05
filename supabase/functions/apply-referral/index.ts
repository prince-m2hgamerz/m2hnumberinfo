 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 const BONUS_CREDITS = 2;
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   const requestId = crypto.randomUUID().slice(0, 8);
   console.log(`[${requestId}] Apply referral request started`);
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const body = await req.json();
     const { userId, referralCode } = body;
 
     // Validate inputs
     const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
     if (!userId || !uuidRegex.test(userId)) {
       return new Response(
         JSON.stringify({ error: 'Invalid user ID' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const sanitizedCode = (referralCode || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
     if (sanitizedCode.length < 6 || sanitizedCode.length > 20) {
       return new Response(
         JSON.stringify({ error: 'Referral code must be 6-20 alphanumeric characters' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log(`[${requestId}] User: ${userId.slice(0, 8)}..., Code: ${sanitizedCode}`);
 
     // Check if user already used a referral code
     const { data: existingUsage } = await supabase
       .from('referrals')
       .select('id')
       .eq('referred_user_id', userId)
       .maybeSingle();
 
     if (existingUsage) {
       console.log(`[${requestId}] User already used a referral code`);
       return new Response(
         JSON.stringify({ error: 'You have already used a referral code' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Find the code owner
     const { data: codeOwner } = await supabase
       .from('users')
       .select('id, credits, referral_code')
       .eq('referral_code', sanitizedCode)
       .maybeSingle();
 
     if (!codeOwner) {
       console.log(`[${requestId}] Referral code not found`);
       return new Response(
         JSON.stringify({ error: 'This referral code does not exist' }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Prevent self-referral
     if (codeOwner.id === userId) {
       console.log(`[${requestId}] Self-referral attempt`);
       return new Response(
         JSON.stringify({ error: 'You cannot use your own referral code' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Check if user already used THIS specific code
     const { data: alreadyUsedThisCode } = await supabase
       .from('referrals')
       .select('id')
       .eq('referral_code', sanitizedCode)
       .eq('referred_user_id', userId)
       .maybeSingle();
 
     if (alreadyUsedThisCode) {
       console.log(`[${requestId}] User already used this specific code`);
       return new Response(
         JSON.stringify({ error: 'You have already used this referral code' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Get current user credits
     const { data: currentUser } = await supabase
       .from('users')
       .select('credits')
       .eq('id', userId)
       .single();
 
     if (!currentUser) {
       return new Response(
         JSON.stringify({ error: 'User not found' }),
         { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Create referral record
     const { error: insertError } = await supabase
       .from('referrals')
       .insert({
         referrer_user_id: codeOwner.id,
         referral_code: sanitizedCode,
         referred_user_id: userId,
         used_at: new Date().toISOString(),
         bonus_credits_awarded: true,
       });
 
     if (insertError) {
       console.error(`[${requestId}] Insert error:`, insertError);
       throw insertError;
     }
 
     // Add credits to referrer
     await supabase
       .from('users')
       .update({ credits: codeOwner.credits + BONUS_CREDITS })
       .eq('id', codeOwner.id);
 
     // Add credits to referred user
     const newCredits = currentUser.credits + BONUS_CREDITS;
     await supabase
       .from('users')
       .update({ credits: newCredits })
       .eq('id', userId);
 
     console.log(`[${requestId}] Referral applied successfully. Both users received ${BONUS_CREDITS} credits`);
 
     return new Response(
       JSON.stringify({
         success: true,
         bonusCredits: BONUS_CREDITS,
         newCredits: newCredits,
       }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error('Error in apply-referral function:', error);
     return new Response(
       JSON.stringify({ error: 'Failed to apply referral code. Please try again.' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });