import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature, x-webhook-timestamp',
};

// Verify Cashfree webhook signature
async function verifyWebhookSignature(
  timestamp: string,
  rawBody: string,
  receivedSignature: string,
  secretKey: string
): Promise<boolean> {
  try {
    const signaturePayload = timestamp + rawBody;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signaturePayload)
    );
    const generatedSignature = base64Encode(signature);
    
    console.log("Signature verification - Generated:", generatedSignature.substring(0, 20) + "...");
    console.log("Signature verification - Received:", receivedSignature.substring(0, 20) + "...");
    
    return generatedSignature === receivedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Get Cashfree signature headers
    const webhookSignature = req.headers.get('x-webhook-signature') || '';
    const webhookTimestamp = req.headers.get('x-webhook-timestamp') || '';

    console.log('Webhook received at:', new Date().toISOString());
    console.log('Webhook signature present:', !!webhookSignature);
    console.log('Webhook timestamp:', webhookTimestamp);
    console.log('Raw body length:', rawBody.length);

    // Get payment settings (secret key) from database
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

    const cashfreeSecretKey = settings['cashfree_secret_key'];

    // Verify webhook signature if secret key is configured and signature is present
    if (cashfreeSecretKey && webhookSignature && webhookTimestamp) {
      const isValid = await verifyWebhookSignature(
        webhookTimestamp,
        rawBody,
        webhookSignature,
        cashfreeSecretKey
      );

      if (!isValid) {
        console.error('Webhook signature verification failed');
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Webhook signature verified successfully');
    } else {
      console.warn('Webhook signature verification skipped - missing signature or secret key');
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    console.log('Webhook payload:', JSON.stringify(payload));

    // Cashfree webhook structure: { data: { order: { order_id }, payment: { payment_status } } }
    // or: { type, data: { ... } }
    const eventType = payload.type;
    const data = payload.data || payload;
    const order_id = data.order?.order_id || data.order_id;
    const order_status = data.order?.order_status || data.order_status;
    const payment_status = data.payment?.payment_status || data.payment_status;

    console.log('Event type:', eventType);
    console.log('Extracted order_id:', order_id);
    console.log('Order status:', order_status, 'Payment status:', payment_status);

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

    // Determine if payment was successful
    const isSuccess = 
      order_status === 'PAID' || 
      payment_status === 'SUCCESS' || 
      eventType === 'PAYMENT_SUCCESS_WEBHOOK';
    
    const isFailed = 
      order_status === 'EXPIRED' || 
      order_status === 'TERMINATED' ||
      payment_status === 'FAILED' ||
      payment_status === 'USER_DROPPED' ||
      eventType === 'PAYMENT_FAILED_WEBHOOK';

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

      const newCredits = user.credits + order.credits;

      // Add credits to user
      const { error: updateError } = await supabase
        .from('users')
        .update({ credits: newCredits })
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

      console.log(`Successfully added ${order.credits} credits to user ${order.user_id}. New balance: ${newCredits}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Added ${order.credits} credits`,
          newBalance: newCredits 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (isFailed) {
      console.log(`Payment failed for order ${order_id}`);
      
      // Update order status to failed
      await supabase
        .from('orders')
        .update({ status: 'failed' })
        .eq('order_id', order_id);

      return new Response(
        JSON.stringify({ success: true, message: 'Order marked as failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Pending or unknown status - acknowledge but don't process
      console.log(`Order ${order_id} status update received: ${order_status || payment_status || eventType}`);
      
      return new Response(
        JSON.stringify({ success: true, message: 'Webhook acknowledged' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in payment-webhook function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
