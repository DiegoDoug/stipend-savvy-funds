import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendVerificationRequest {
  actionType: 'email_change' | 'account_reactivation' | 'account_deletion';
  email: string;
  newEmail?: string; // For email change action
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { actionType, email, newEmail }: SendVerificationRequest = await req.json();

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code in database
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        user_id: user.id,
        action_type: actionType,
        code,
        email: newEmail || email,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to create verification code');
    }

    // Prepare email content based on action type
    let subject = '';
    let htmlContent = '';

    switch (actionType) {
      case 'email_change':
        subject = 'Verify Your Email Change';
        htmlContent = `
          <h1>Email Change Verification</h1>
          <p>Hi there,</p>
          <p>You requested to change your email address to <strong>${newEmail}</strong>.</p>
          <p>Your verification code is:</p>
          <h2 style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-family: monospace;">${code}</h2>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this change, please ignore this email.</p>
          <p>Best regards,<br>FinancialTrackApp Team</p>
        `;
        break;

      case 'account_reactivation':
        subject = 'Reactivate Your Account';
        htmlContent = `
          <h1>Account Reactivation</h1>
          <p>Hi there,</p>
          <p>You requested to reactivate your account.</p>
          <p>Your verification code is:</p>
          <h2 style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-family: monospace;">${code}</h2>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please secure your account immediately.</p>
          <p>Best regards,<br>FinancialTrackApp Team</p>
        `;
        break;

      case 'account_deletion':
        subject = '⚠️ Confirm Account Deletion';
        htmlContent = `
          <h1 style="color: #dc2626;">Account Deletion Confirmation</h1>
          <p>Hi there,</p>
          <p><strong>You requested to permanently delete your account.</strong></p>
          <p>⚠️ This action cannot be undone. All your data will be permanently deleted.</p>
          <p>Your verification code is:</p>
          <h2 style="background: #fee2e2; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-family: monospace; color: #dc2626;">${code}</h2>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please secure your account immediately and change your password.</p>
          <p>Best regards,<br>FinancialTrackApp Team</p>
        `;
        break;
    }

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: "FinancialTrackApp <onboarding@resend.dev>",
      to: [newEmail || email],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Verification code sent successfully',
        expiresAt: expiresAt.toISOString()
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-verification-code function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
