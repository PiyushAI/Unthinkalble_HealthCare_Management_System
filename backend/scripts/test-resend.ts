import { Resend } from "resend";
import "dotenv/config";

const resendApiKey = process.env.RESEND_API_KEY!;
const fromAddress = "onboarding@resend.dev"; // Clean test sender
const resend = new Resend(resendApiKey);

async function testEmail() {
  console.log("Testing Resend API Key:", resendApiKey ? "Present (starts with " + resendApiKey.substring(0, 7) + "...)" : "MISSING");
  console.log("Sender:", fromAddress);

  // Test sending to your account email
  const targetEmail = "piyushcricketfan619@gmail.com";
  console.log(`Attempting to send test email to: ${targetEmail}...`);

  const { data, error } = await resend.emails.send({
    from: "MediFlow <onboarding@resend.dev>",
    to: targetEmail,
    subject: "Appointment Confirmed - MediFlow (Test Verification)",
    html: "<strong>Hello!</strong> Your MediFlow email notification system is working 100% properly!",
  });

  if (error) {
    console.error("❌ Resend Error:", JSON.stringify(error, null, 2));
  } else {
    console.log("✅ Email successfully sent via Resend! ID:", data?.id);
  }
}

testEmail();
