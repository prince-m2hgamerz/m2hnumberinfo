import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// Security: Input validation helper
const validateUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const validateOrderId = (orderId: string): boolean => {
  // Order IDs should match our format: ORDER_timestamp_random or with _R suffix for resumed
  const orderIdRegex = /^ORDER_\d+_[a-z0-9]+(_R[a-z0-9]+)?$/i;
  return orderIdRegex.test(orderId) && orderId.length <= 100;
};

const sanitizeNumber = (value: unknown): number | null => {
  const num = Number(value);
  if (isNaN(num) || num <= 0 || num > 1000000) return null;
  return num;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] Create order request started`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { userId, credits, amount, resumeOrderId } = body;

    // Security: Validate inputs
    if (userId && !validateUUID(userId)) {
      console.log(`[${requestId}] Invalid userId format`);
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (resumeOrderId && !validateOrderId(resumeOrderId)) {
      console.log(`[${requestId}] Invalid resumeOrderId format`);
      return new Response(JSON.stringify({ error: "Invalid order ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${requestId}] User: ${userId?.slice(0, 8)}..., Credits: ${credits}, Resume: ${resumeOrderId?.slice(0, 16) || 'N/A'}`);

    // Handle resume order flow
    if (resumeOrderId) {
      // Check if order exists and is resumable (within 2 hours)
      const { data: existingOrder, error: orderFetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', resumeOrderId)
        .single();

      if (orderFetchError || !existingOrder) {
        console.log(`[${requestId}] Order not found for resume`);
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Security: Verify user owns this order
      if (userId && existingOrder.user_id !== userId) {
        console.log(`[${requestId}] Unauthorized order access attempt`);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if order is still pending
      if (existingOrder.status !== 'pending') {
        return new Response(JSON.stringify({ 
          error: "Order cannot be resumed", 
          status: existingOrder.status 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if order is within 2 hours
      const createdAt = new Date(existingOrder.created_at).getTime();
      const now = Date.now();
      if ((now - createdAt) >= TWO_HOURS_MS) {
        // Mark as failed if expired
        await supabase
          .from('orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('order_id', resumeOrderId);

        return new Response(JSON.stringify({ 
          error: "Order has expired. Please create a new order.",
          expired: true
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get payment settings
      const { data: settingsData } = await supabase
        .from('payment_settings')
        .select('setting_key, setting_value');

      const settings: Record<string, string> = {};
      settingsData?.forEach((s: { setting_key: string; setting_value: string }) => {
        settings[s.setting_key] = s.setting_value;
      });

      const cashfreeMode = settings['cashfree_mode'] || 'sandbox';
      const cashfreeAppId = settings['cashfree_app_id'];
      const cashfreeSecret = settings['cashfree_secret_key'];

      if (!cashfreeAppId || !cashfreeSecret) {
        return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const CASHFREE_API_URL = cashfreeMode === 'production' 
        ? "https://api.cashfree.com/pg" 
        : "https://sandbox.cashfree.com/pg";
      const API_VERSION = "2023-08-01";

      // Try to fetch existing order status from Cashfree
      const checkResponse = await fetch(`${CASHFREE_API_URL}/orders/${resumeOrderId}`, {
        method: "GET",
        headers: {
          "x-client-id": cashfreeAppId,
          "x-client-secret": cashfreeSecret,
          "x-api-version": API_VERSION,
        },
      });

      if (checkResponse.ok) {
        const orderData = await checkResponse.json();
        console.log("Existing Cashfree order:", JSON.stringify(orderData));

        // If order is still ACTIVE, return the existing payment session
        if (orderData.order_status === 'ACTIVE' && orderData.payment_session_id) {
          return new Response(
            JSON.stringify({
              success: true,
              orderId: resumeOrderId,
              paymentSessionId: orderData.payment_session_id,
              cashfreeMode,
              resumed: true,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      // If we can't resume the existing order, create a new payment session
      // by creating a new order with updated order_id
      const newOrderId = `${resumeOrderId}_R${Date.now().toString(36)}`;
      const origin = req.headers.get("origin") || "https://lovable.dev";

      // Get user details
      const { data: user } = await supabase.from("users").select("*").eq("id", existingOrder.user_id).single();

      const cashfreePayload = {
        order_id: newOrderId,
        order_amount: parseFloat(existingOrder.amount),
        order_currency: "INR",
        customer_details: {
          customer_id: existingOrder.user_id.substring(0, 25),
          customer_name: user?.username || "Customer",
          customer_email: `${user?.username || 'customer'}@numberinfo.local`,
          customer_phone: "9999999999",
        },
        order_meta: {
          return_url: `${origin}/dashboard?order_id=${newOrderId}&status={order_status}`,
          notify_url: `${supabaseUrl}/functions/v1/payment-webhook`,
        },
      };

      const cashfreeResponse = await fetch(`${CASHFREE_API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": cashfreeAppId,
          "x-client-secret": cashfreeSecret,
          "x-api-version": API_VERSION,
        },
        body: JSON.stringify(cashfreePayload),
      });

      const cashfreeData = await cashfreeResponse.json();

      if (!cashfreeResponse.ok) {
        return new Response(
          JSON.stringify({ error: cashfreeData.message || "Payment gateway error" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Update the original order with new order_id (so credits get added correctly)
      await supabase
        .from('orders')
        .update({ 
          order_id: newOrderId, 
          updated_at: new Date().toISOString() 
        })
        .eq('order_id', resumeOrderId);

      return new Response(
        JSON.stringify({
          success: true,
          orderId: newOrderId,
          paymentSessionId: cashfreeData.payment_session_id,
          cashfreeMode,
          resumed: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Regular new order flow - Security: Validate all inputs
    const validCredits = sanitizeNumber(credits);
    const validAmount = sanitizeNumber(amount);

    if (!userId || !validCredits || !validAmount) {
      console.log(`[${requestId}] Missing or invalid required fields`);
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get payment settings from database
    const { data: settingsData, error: settingsError } = await supabase
      .from('payment_settings')
      .select('setting_key, setting_value');

    if (settingsError) {
      console.error(`[${requestId}] Error fetching payment settings:`, settingsError);
      return new Response(JSON.stringify({ error: "Failed to load payment settings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      console.error(`[${requestId}] Cashfree credentials not configured`);
      return new Response(JSON.stringify({ error: "Payment gateway not configured. Please contact admin." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Set API URL based on mode
    const CASHFREE_API_URL = cashfreeMode === 'production' 
      ? "https://api.cashfree.com/pg" 
      : "https://sandbox.cashfree.com/pg";
    const API_VERSION = "2023-08-01";

    console.log(`[${requestId}] Using Cashfree ${cashfreeMode} mode`);

    // Verify user exists and is not banned
    const { data: user, error: userError } = await supabase.from("users").select("*").eq("id", userId).single();

    if (userError || !user) {
      console.log(`[${requestId}] User not found`);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (user.banned) {
      console.log(`[${requestId}] Banned user attempted order`);
      return new Response(JSON.stringify({ error: "Account is banned" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique order ID
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Get the origin for return URL
    const origin = req.headers.get("origin") || "https://lovable.dev";

    // Security: Sanitize username for Cashfree
    const safeUsername = user.username.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || 'customer';

    // Create Cashfree order with payment_session
    const cashfreePayload = {
      order_id: orderId,
      order_amount: validAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: user.id.substring(0, 25),
        customer_name: safeUsername,
        customer_email: `${safeUsername}@numberinfo.local`,
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `${origin}/dashboard?order_id=${orderId}&status={order_status}`,
        notify_url: `${supabaseUrl}/functions/v1/payment-webhook`,
      },
    };

    console.log(`[${requestId}] Creating Cashfree order for ₹${validAmount}`);

    const cashfreeResponse = await fetch(`${CASHFREE_API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": cashfreeAppId,
        "x-client-secret": cashfreeSecret,
        "x-api-version": API_VERSION,
      },
      body: JSON.stringify(cashfreePayload),
    });

    const cashfreeData = await cashfreeResponse.json();
    console.log(`[${requestId}] Cashfree response status: ${cashfreeResponse.status}`);

    if (!cashfreeResponse.ok) {
      console.error(`[${requestId}] Cashfree error:`, cashfreeData.message);
      return new Response(
        JSON.stringify({
          error: cashfreeData.message || "Payment gateway error",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Store order in database
    const { error: orderError } = await supabase.from("orders").insert({
      order_id: orderId,
      user_id: userId,
      credits: validCredits,
      amount: validAmount,
      status: "pending",
    });

    if (orderError) {
      console.error(`[${requestId}] Error storing order:`, orderError);
      return new Response(JSON.stringify({ error: "Failed to store order" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentSessionId = cashfreeData.payment_session_id;
    const paymentLink = paymentSessionId
      ? `https://payments.cashfree.com/order/#${paymentSessionId}`
      : cashfreeData.payment_link;

    console.log(`[${requestId}] Order created successfully: ${orderId.slice(0, 20)}...`);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderId,
        paymentSessionId: paymentSessionId,
        paymentLink: paymentLink,
        cfOrderId: cashfreeData.cf_order_id,
        cashfreeMode,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in create-order function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
