import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CASHFREE_API_URL = 'https://api.cashfree.com/pg';
const API_VERSION = '2023-08-01';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cashfreeAppId = Deno.env.get('CASHFREE_APP_ID')!;
    const cashfreeSecret = Deno.env.get('CASHFREE_SECRET_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId } = await req.json();

    console.log(`Verifying payment for order: ${orderId}`);

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

      // Add credits
      await supabase
        .from('users')
        .update({ credits: user.credits + order.credits })
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

      return new Response(
        JSON.stringify({ 
          success: true, 
          status: 'completed',
          credits: order.credits,
          message: `Successfully added ${order.credits} credits!` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          status: verifyData.order_status,
          message: 'Payment not completed' 
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
