import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

// This function checks for expired orders and marks them as failed
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Checking expired orders for user: ${userId}`);

    // Get all pending orders for the user
    const { data: pendingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (fetchError) {
      console.error("Error fetching pending orders:", fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch orders" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const expiredOrders: string[] = [];

    for (const order of pendingOrders || []) {
      const createdAt = new Date(order.created_at).getTime();
      if ((now - createdAt) >= TWO_HOURS_MS) {
        // Mark as failed
        const { error: updateError } = await supabase
          .from('orders')
          .update({ 
            status: 'failed', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', order.id);

        if (!updateError) {
          expiredOrders.push(order.order_id);
          console.log(`Marked order ${order.order_id} as failed (expired)`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiredOrders,
        message: expiredOrders.length > 0 
          ? `${expiredOrders.length} order(s) marked as failed due to expiry`
          : 'No expired orders found'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in check-expired-orders:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
