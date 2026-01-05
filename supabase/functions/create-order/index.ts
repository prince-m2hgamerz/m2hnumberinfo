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

    const { userId, credits, amount } = await req.json();

    console.log(`Create order request - User: ${userId}, Credits: ${credits}, Amount: ${amount}`);

    if (!userId || !credits || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user exists
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

    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create Cashfree order
    const cashfreePayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: userId,
        customer_name: user.username,
        customer_email: `${user.username}@numberinfo.app`,
        customer_phone: '9999999999',
      },
      order_meta: {
        return_url: `${req.headers.get('origin') || 'https://lovable.dev'}/dashboard?order_id=${orderId}&status={order_status}`,
      },
    };

    console.log('Creating Cashfree order:', JSON.stringify(cashfreePayload));

    const cashfreeResponse = await fetch(`${CASHFREE_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': cashfreeAppId,
        'x-client-secret': cashfreeSecret,
        'x-api-version': API_VERSION,
      },
      body: JSON.stringify(cashfreePayload),
    });

    const cashfreeData = await cashfreeResponse.json();
    console.log('Cashfree response:', JSON.stringify(cashfreeData));

    if (!cashfreeResponse.ok) {
      throw new Error(cashfreeData.message || 'Failed to create Cashfree order');
    }

    // Store order in database
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        order_id: orderId,
        user_id: userId,
        credits: credits,
        amount: amount,
        status: 'pending',
      });

    if (orderError) {
      console.error('Error storing order:', orderError);
      throw new Error('Failed to store order');
    }

    // Extract payment link from response
    const paymentLink = cashfreeData.payment_link || 
                        cashfreeData.payments?.url || 
                        cashfreeData.order_meta?.payment_link ||
                        `https://payments.cashfree.com/order/#${cashfreeData.payment_session_id}`;

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderId,
        paymentLink: paymentLink,
        paymentSessionId: cashfreeData.payment_session_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-order function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
