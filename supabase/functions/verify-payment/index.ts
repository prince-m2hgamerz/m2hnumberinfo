import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_VERSION = '2023-08-01';

// Security: Input validation
const validateOrderId = (orderId: string): boolean => {
  const orderIdRegex = /^ORDER_\d+_[a-z0-9]+(_R[a-z0-9]+)?$/i;
  return typeof orderId === 'string' && orderIdRegex.test(orderId) && orderId.length <= 100;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] Verify payment request started`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { orderId } = body;

    // Security: Validate orderId format
    if (!orderId || !validateOrderId(orderId)) {
      console.log(`[${requestId}] Invalid orderId format`);
      return new Response(
        JSON.stringify({ error: 'Invalid order ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Verifying order: ${orderId.slice(0, 20)}...`);

    // Get payment settings from database
    const { data: settingsData, error: settingsError } = await supabase
      .from('payment_settings')
      .select('setting_key, setting_value');

    if (settingsError) {
      console.error(`[${requestId}] Error fetching payment settings`);
      return new Response(
        JSON.stringify({ error: "Failed to load payment settings" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse settings - hide sensitive data from logs
    const settings: Record<string, string> = {};
    settingsData?.forEach((s: { setting_key: string; setting_value: string }) => {
      settings[s.setting_key] = s.setting_value;
    });

    const cashfreeMode = settings['cashfree_mode'] || 'sandbox';
    const cashfreeAppId = settings['cashfree_app_id'];
    const cashfreeSecret = settings['cashfree_secret_key'];

    if (!cashfreeAppId || !cashfreeSecret) {
      console.error(`[${requestId}] Cashfree credentials not configured`);
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set API URL based on mode
    const CASHFREE_API_URL = cashfreeMode === 'production' 
      ? "https://api.cashfree.com/pg" 
      : "https://sandbox.cashfree.com/pg";

    // Check order in our database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      console.log(`[${requestId}] Order not found in database`);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already completed, return success
    if (order.status === 'completed') {
      console.log(`[${requestId}] Order already completed`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'completed',
          credits: order.credits,
          message: 'Payment already verified and credits added' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify with Cashfree
    const verifyResponse = await fetch(`${CASHFREE_API_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-client-id': cashfreeAppId,
        'x-client-secret': cashfreeSecret,
        'x-api-version': API_VERSION,
      },
    });

    const verifyData = await verifyResponse.json();
    console.log(`[${requestId}] Cashfree status: ${verifyData.order_status}`);

    const isSuccess = verifyData.order_status === 'PAID';

    if (isSuccess) {
      // Get current user credits
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('credits, banned')
        .eq('id', order.user_id)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      // Security: Don't add credits to banned users
      if (user.banned) {
        console.log(`[${requestId}] Banned user payment - marking completed but not adding credits`);
        await supabase.from('orders').update({ status: 'completed' }).eq('order_id', orderId);
        return new Response(
          JSON.stringify({ success: false, status: 'banned', message: 'Account is banned' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newCredits = user.credits + order.credits;

      // Add credits
      await supabase
        .from('users')
        .update({ credits: newCredits })
        .eq('id', order.user_id);

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('order_id', orderId);

      // Update global stats
      const { data: stats } = await supabase
        .from('stats')
        .select('*')
        .single();

      if (stats) {
        await supabase
          .from('stats')
          .update({
            total_payments: stats.total_payments + 1,
            total_revenue: parseFloat(stats.total_revenue) + parseFloat(order.amount),
          })
          .eq('id', stats.id);
      }

      console.log(`[${requestId}] Payment verified! +${order.credits} credits. New balance: ${newCredits}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'completed',
          credits: order.credits,
          newBalance: newCredits,
          message: `Successfully added ${order.credits} credits!` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Update order status to failed if explicitly failed
      if (verifyData.order_status === 'EXPIRED' || verifyData.order_status === 'TERMINATED') {
        await supabase
          .from('orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('order_id', orderId);
        console.log(`[${requestId}] Order marked as failed: ${verifyData.order_status}`);
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          status: verifyData.order_status || 'pending',
          message: verifyData.order_status === 'ACTIVE' 
            ? 'Payment is still pending' 
            : 'Payment not completed' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in verify-payment function:', error);
    return new Response(
      JSON.stringify({ error: 'Verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
