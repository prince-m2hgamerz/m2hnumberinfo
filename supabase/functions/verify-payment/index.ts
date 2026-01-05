import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_VERSION = '2023-08-01';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId } = await req.json();

    console.log(`Verifying payment for order: ${orderId}`);

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment settings from database (same as create-order)
    const { data: settingsData, error: settingsError } = await supabase
      .from('payment_settings')
      .select('setting_key, setting_value');

    if (settingsError) {
      console.error("Error fetching payment settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to load payment settings" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse settings
    const settings: Record<string, string> = {};
    settingsData?.forEach((s: { setting_key: string; setting_value: string }) => {
      settings[s.setting_key] = s.setting_value;
    });

    const cashfreeMode = settings['cashfree_mode'] || 'sandbox';
    const cashfreeAppId = settings['cashfree_app_id'];
    const cashfreeSecret = settings['cashfree_secret_key'];

    if (!cashfreeAppId || !cashfreeSecret) {
      console.error("Cashfree credentials not configured");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set API URL based on mode
    const CASHFREE_API_URL = cashfreeMode === 'production' 
      ? "https://api.cashfree.com/pg" 
      : "https://sandbox.cashfree.com/pg";

    console.log(`Using Cashfree ${cashfreeMode} mode for verification`);

    // Check order in our database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderId);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already completed, return success
    if (order.status === 'completed') {
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
    console.log('Cashfree verification response:', JSON.stringify(verifyData));

    const isSuccess = verifyData.order_status === 'PAID';

    if (isSuccess) {
      // Get current user credits
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', order.user_id)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
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
        .update({ status: 'completed' })
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

      console.log(`Payment verified! Added ${order.credits} credits. New balance: ${newCredits}`);

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
          .update({ status: 'failed' })
          .eq('order_id', orderId);
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
