import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function testLogin() {
  console.log("Testing Supabase auth sign-in for Dr. Jenkins...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "dr.jenkins@hospital.com",
    password: "Password123!",
  });

  if (error) {
    console.error("❌ Sign-in failed:", error.message);
  } else {
    console.log("✅ Sign-in SUCCESS! User ID:", data.user?.id, "Email:", data.user?.email);
  }

  console.log("Testing Supabase auth sign-in for Admin...");
  const adminRes = await supabase.auth.signInWithPassword({
    email: "admin@hospital.com",
    password: "Password123!",
  });

  if (adminRes.error) {
    console.error("❌ Admin sign-in failed:", adminRes.error.message);
  } else {
    console.log("✅ Admin sign-in SUCCESS! User ID:", adminRes.data.user?.id, "Email:", adminRes.data.user?.email);
  }
}

testLogin();
