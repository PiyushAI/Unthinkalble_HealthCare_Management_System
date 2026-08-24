// Supabase Edge Function: send-consultation-summary
// Deployed to: https://<project-ref>.supabase.co/functions/v1/send-consultation-summary

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConsultationSummaryPayload {
  appointmentId: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorSpecialization: string;
  slotStart: string;
  summary: string;
  diagnosis?: string;
  symptoms?: string;
  treatment?: string;
  medications?: string;
  recommendations?: string;
  followUpInstructions?: string;
  dashboardUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM") || "MediFlow <appointments@yourdomain.com>";
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:3000";

    const payload: ConsultationSummaryPayload = await req.json();
    const {
      appointmentId,
      patientName,
      patientEmail,
      doctorName,
      doctorSpecialization,
      slotStart,
      summary,
      diagnosis = "Clinical evaluation completed",
      symptoms = "Reviewed in consultation",
      treatment = "As prescribed",
      medications = "None prescribed",
      recommendations = "Adequate rest and hydration",
      followUpInstructions = "Contact clinic if symptoms persist",
      dashboardUrl = `${appUrl}/patient/records`,
    } = payload;

    if (!patientEmail || !patientName || !appointmentId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields (patientEmail, patientName, appointmentId)" }),
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

    // MediFlow Consultation Summary Email Template
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Consultation Summary - MediFlow</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <tr>
              <td style="background-color: #003c90; padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">MediFlow</h1>
                <p style="color: #bcceff; margin: 6px 0 0 0; font-size: 15px; font-weight: 500;">Your Consultation Summary</p>
              </td>
            </tr>

            <!-- Main Content -->
            <tr>
              <td style="padding: 32px 28px;">
                <p style="font-size: 16px; margin: 0 0 12px 0;">Hello <strong>${patientName}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
                  Your consultation with <strong>Dr. ${doctorName}</strong> has been completed. Here is the full summary of your clinical visit.
                </p>

                <!-- Appointment Details Card -->
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
                  <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #003c90; text-transform: uppercase; letter-spacing: 0.5px;">Appointment Details</h3>
                  <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 14px; color: #334155;">
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
                  </table>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

                <!-- Clinical Summary Sections -->
                <div style="margin-bottom: 20px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Consultation Summary</h4>
                  <div style="background-color: #f1f5f9; padding: 14px; border-radius: 6px; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-line;">
                    ${summary}
                  </div>
                </div>

                <div style="margin-bottom: 20px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Diagnosis</h4>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${diagnosis}</p>
                </div>

                <div style="margin-bottom: 20px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Treatment / Advice</h4>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${treatment}</p>
                </div>

                <div style="margin-bottom: 20px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Medications</h4>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${medications}</p>
                </div>

                <div style="margin-bottom: 20px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Recommendations</h4>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${recommendations}</p>
                </div>

                <div style="margin-bottom: 24px;">
                  <h4 style="margin: 0 0 6px 0; font-size: 14px; color: #003c90; text-transform: uppercase;">Follow-up Instructions</h4>
                  <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">${followUpInstructions}</p>
                </div>

                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />

                <p style="font-size: 14px; color: #64748b; margin: 0 0 20px 0; text-align: center;">
                  You can also view your consultation history from your MediFlow patient dashboard.
                </p>

                <!-- Button -->
                <div style="text-align: center; margin-bottom: 24px;">
                  <a href="${dashboardUrl}" style="display: inline-block; background-color: #003c90; color: #ffffff; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,60,144,0.2);">
                    View Consultation
                  </a>
                </div>
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
          subject: "Your Consultation Summary - MediFlow",
          html: htmlBody,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        return new Response(JSON.stringify({ error: resData.message || "Failed to send consultation summary via Resend" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, messageId: resData.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[SIMULATED CONSULTATION EMAIL] To: ${patientEmail} | Subject: Your Consultation Summary - MediFlow`);
    return new Response(
      JSON.stringify({ success: true, simulated: true, message: "Consultation email logged in console (RESEND_API_KEY is not live yet)" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Consultation Edge function error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
