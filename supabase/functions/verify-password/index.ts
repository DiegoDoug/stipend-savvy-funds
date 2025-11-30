import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyPasswordRequest {
  password: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user || !user.email) {
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { password }: VerifyPasswordRequest = await req.json();
    if (!password) {
      return new Response(
        JSON.stringify({ error: "Password required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for rate limiting using verification_codes table
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentAttempts, error: attemptsError } = await supabaseAdmin
      .from('verification_codes')
      .select('id, verification_attempts, locked_until')
      .eq('user_id', user.id)
      .eq('action_type', 'password_verify')
      .gte('created_at', fifteenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (attemptsError) {
      console.error('Error checking attempts:', attemptsError);
    }

    // Check if user is locked out
    if (recentAttempts && recentAttempts.length > 0) {
      const latestAttempt = recentAttempts[0];
      if (latestAttempt.locked_until) {
        const lockoutTime = new Date(latestAttempt.locked_until);
        if (lockoutTime > new Date()) {
          const remainingMinutes = Math.ceil((lockoutTime.getTime() - Date.now()) / 60000);
          console.log(`User ${user.id} is locked out for ${remainingMinutes} more minutes`);
          return new Response(
            JSON.stringify({ error: "Too many failed attempts. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Check total attempts
      if (latestAttempt.verification_attempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await supabaseAdmin
          .from('verification_codes')
          .update({ locked_until: lockUntil })
          .eq('id', latestAttempt.id);
        
        console.log(`User ${user.id} locked out after 5 failed attempts`);
        return new Response(
          JSON.stringify({ error: "Too many failed attempts. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Verify password using Supabase auth
    const { error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: user.email,
      password: password
    });

    if (signInError) {
      // Track failed attempt
      if (recentAttempts && recentAttempts.length > 0) {
        const latestAttempt = recentAttempts[0];
        await supabaseAdmin
          .from('verification_codes')
          .update({ 
            verification_attempts: latestAttempt.verification_attempts + 1 
          })
          .eq('id', latestAttempt.id);
      } else {
        // Create new attempt tracking record
        await supabaseAdmin
          .from('verification_codes')
          .insert({
            user_id: user.id,
            email: user.email,
            action_type: 'password_verify',
            code: 'N/A', // Not used for password verification
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            verification_attempts: 1,
            used: false
          });
      }

      console.log(`Failed password verification for user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Verification failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success - clear attempts if they exist
    if (recentAttempts && recentAttempts.length > 0) {
      await supabaseAdmin
        .from('verification_codes')
        .delete()
        .eq('id', recentAttempts[0].id);
    }

    console.log(`Successful password verification for user ${user.id}`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in verify-password function:", error);
    return new Response(
      JSON.stringify({ error: "Verification failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
