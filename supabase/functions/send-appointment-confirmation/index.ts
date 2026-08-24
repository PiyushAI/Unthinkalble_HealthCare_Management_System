// Supabase Edge Function: send-appointment-confirmation
// Deployed to: https://<project-ref>.supabase.co/functions/v1/send-appointment-confirmation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationPayload {
  appointmentId: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorSpecialization: string;
  slotStart: string;
  clinicName?: string;
  dashboardUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM") || "MediFlow <appointments@yourdomain.com>";
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:3000";

    const payload: ConfirmationPayload = await req.json();
    const {
      appointmentId,
      patientName,
      patientEmail,
      doctorName,
      doctorSpecialization,
      slotStart,
      clinicName = "MediFlow Medical Center",
      dashboardUrl = `${appUrl}/patient/appointments`,
    } = payload;

    // Validate required fields
    if (!patientEmail || !patientName || !appointmentId) {
      return new Response(
        JSON.stringify({ error: "Missing required appointment fields (patientEmail, patientName, appointmentId)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dateObj = new Date(slotStart);
    const formattedDate = isNaN(dateObj.getTime())
      ? slotStart
      : dateObj.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const formattedTime = isNaN(dateObj.getTime())
      ? ""
      : dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    // MediFlow Professional Healthcare Confirmation Email Template
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Confirmed - MediFlow</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <tr>
              <td style="background-color: #003c90; padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">MediFlow</h1>
                <p style="color: #bcceff; margin: 6px 0 0 0; font-size: 14px; font-weight: 500;">Healthcare Appointment & Care Manager</p>
              </td>
            </tr>

            <!-- Status Banner -->
            <tr>
              <td style="background-color: #ecfdf5; border-bottom: 1px solid #d1fae5; padding: 14px 24px; text-align: center;">
                <span style="color: #065f46; font-size: 15px; font-weight: 600;">✓ Appointment Confirmed</span>
              </td>
            </tr>

            <!-- Main Body -->
            <tr>
              <td style="padding: 32px 28px;">
                <p style="font-size: 16px; margin: 0 0 12px 0;">Hello <strong>${patientName}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
                  Your appointment has been successfully booked. Please find your consultation summary below.
                </p>

                <!-- Appointment Details Card -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
                  <h3 style="margin: 0 0 16px 0; font-size: 15px; color: #003c90; text-transform: uppercase; letter-spacing: 0.5px;">Appointment Details</h3>
                  <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 14px; color: #334155;">
                    <tr>
                      <td width="35%" style="color: #64748b; font-weight: 500;">Doctor:</td>
                      <td style="font-weight: 600; color: #0f172a;">${doctorName}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Specialization:</td>
                      <td style="font-weight: 600; color: #0f172a;">${doctorSpecialization}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Date:</td>
                      <td style="font-weight: 600; color: #0f172a;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Time:</td>
                      <td style="font-weight: 600; color: #0f172a;">${formattedTime}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Appointment ID:</td>
                      <td style="font-family: monospace; color: #0284c7; font-weight: 600;">${appointmentId}</td>
                    </tr>
                    <tr>
                      <td style="color: #64748b; font-weight: 500;">Clinic/Hospital:</td>
                      <td style="font-weight: 600; color: #0f172a;">${clinicName}</td>
                    </tr>
                  </table>
                </div>

                <!-- Action Button -->
                <div style="text-align: center; margin-bottom: 28px;">
                  <a href="${dashboardUrl}" style="display: inline-block; background-color: #003c90; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,60,144,0.2);">
                    View Appointment
                  </a>
                </div>

                <!-- Notice -->
                <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0; background-color: #f1f5f9; padding: 12px 16px; border-radius: 6px;">
                  ℹ️ If you need to cancel or reschedule your appointment, please use your <strong>MediFlow dashboard</strong>.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0 0 6px 0;">This is an automated email from MediFlow. Please do not reply to this email.</p>
                <p style="margin: 0;">&copy; ${new Date().getFullYear()} MediFlow Healthcare System. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    if (resendApiKey && !resendApiKey.includes("mock")) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: patientEmail,
          subject: "Appointment Confirmed - MediFlow",
          html: htmlBody,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        console.error("Resend API Error:", resData);
        return new Response(JSON.stringify({ error: resData.message || "Failed to send email via Resend" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, messageId: resData.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Simulated log for local development
    console.log(`[SIMULATED EMAIL] To: ${patientEmail} | Subject: Appointment Confirmed - MediFlow | Appt ID: ${appointmentId}`);
    return new Response(
      JSON.stringify({ success: true, simulated: true, message: "Email logged in console (RESEND_API_KEY is not live yet)" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
