import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload));

    // Cashfree webhook structure: { data: { order: { order_id }, payment: { payment_status } } }
    const data = payload.data || payload;
    const order_id = data.order?.order_id || data.order_id;
    const order_status = data.order?.order_status || data.order_status;
    const payment_status = data.payment?.payment_status || data.payment_status;

    console.log('Extracted order_id:', order_id, 'payment_status:', payment_status);

    if (!order_id) {
      console.error('No order_id in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing order_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', order_id, orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order is already processed
    if (order.status === 'completed') {
      console.log('Order already processed:', order_id);
      return new Response(
        JSON.stringify({ message: 'Order already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuccess = order_status === 'PAID' || payment_status === 'SUCCESS';

    if (isSuccess) {
      console.log(`Payment successful for order ${order_id}, adding ${order.credits} credits`);

      // Get current user credits
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', order.user_id)
        .single();

      if (userError || !user) {
        console.error('User not found for order:', order.user_id);
        throw new Error('User not found');
      }

      // Add credits to user
      const { error: updateError } = await supabase
        .from('users')
        .update({ credits: user.credits + order.credits })
        .eq('id', order.user_id);

      if (updateError) {
        console.error('Error updating user credits:', updateError);
        throw new Error('Failed to update credits');
      }

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('order_id', order_id);

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

      console.log(`Successfully added ${order.credits} credits to user ${order.user_id}`);
    } else {
      console.log(`Payment failed for order ${order_id}`);
      
      // Update order status to failed
      await supabase
        .from('orders')
        .update({ status: 'failed' })
        .eq('order_id', order_id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in payment-webhook function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
