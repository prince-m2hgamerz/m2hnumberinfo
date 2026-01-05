import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { cashfreeMode, cashfreeAppId, cashfreeSecretKey, adminPassword } = await req.json();

    // Simple admin password check
    const ADMIN_PASSWORD = "m2hgamerz";
    if (adminPassword !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Updating payment settings - Mode: ${cashfreeMode}`);

    // Update all settings
    const updates = [
      { setting_key: 'cashfree_mode', setting_value: cashfreeMode },
      { setting_key: 'cashfree_app_id', setting_value: cashfreeAppId },
      { setting_key: 'cashfree_secret_key', setting_value: cashfreeSecretKey },
    ];

    for (const update of updates) {
      const { error } = await supabase
        .from('payment_settings')
        .update({ setting_value: update.setting_value })
        .eq('setting_key', update.setting_key);

      if (error) {
        console.error(`Error updating ${update.setting_key}:`, error);
        throw error;
      }
    }

    console.log("Payment settings updated successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Settings saved successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating payment settings:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
