import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyCodeRequest {
  actionType: 'email_change' | 'account_reactivation' | 'account_deletion';
  inputCode: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Use service role key to bypass RLS and access verification_codes table
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user with anon key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { actionType, inputCode } = await req.json() as VerifyCodeRequest;

    console.log(`Verification attempt for user ${user.id}, action: ${actionType}`);

    // Get the most recent unused verification code for this action using service role
    const { data: verificationCode, error: fetchError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('action_type', actionType)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Database fetch error:", fetchError);
      throw fetchError;
    }

    if (!verificationCode) {
      console.log("No valid verification code found");
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "No valid verification code found. Please request a new one." 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if code is locked due to too many attempts
    if (verificationCode.locked_until && new Date(verificationCode.locked_until) > new Date()) {
      const lockMinutes = Math.ceil((new Date(verificationCode.locked_until).getTime() - Date.now()) / 60000);
      console.log(`Code is locked for ${lockMinutes} more minutes`);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Too many failed attempts. Please try again in ${lockMinutes} minute${lockMinutes > 1 ? 's' : ''}.` 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Compare the input code with the hashed code using Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(inputCode);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    const isValid = inputHash === verificationCode.code;

    if (!isValid) {
      // Increment verification attempts
      const newAttempts = (verificationCode.verification_attempts || 0) + 1;
      const updateData: any = {
        verification_attempts: newAttempts
      };

      // Lock the code after 5 failed attempts for 15 minutes
      if (newAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        console.log(`Code locked after ${newAttempts} attempts`);
      }

      await supabaseAdmin
        .from('verification_codes')
        .update(updateData)
        .eq('id', verificationCode.id);

      const attemptsRemaining = Math.max(0, 5 - newAttempts);
      console.log(`Incorrect code. Attempts remaining: ${attemptsRemaining}`);

      return new Response(
        JSON.stringify({ 
          valid: false,
          error: newAttempts >= 5 
            ? "Too many failed attempts. Code locked for 15 minutes."
            : `Incorrect code. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Mark code as used
    const { error: updateError } = await supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationCode.id);

    if (updateError) {
      console.error("Error marking code as used:", updateError);
      throw updateError;
    }

    console.log("Verification successful");

    return new Response(
      JSON.stringify({ valid: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-code function:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
