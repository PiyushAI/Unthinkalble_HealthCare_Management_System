import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const key = process.env.GEMINI_API_KEY!;
console.log("Testing GEMINI_API_KEY:", key);

const genAI = new GoogleGenerativeAI(key);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Sending prompt to Gemini...");
    const res = await model.generateContent("Hello, format this symptom: headache");
    console.log("Gemini Response:", res.response.text());
  } catch (err: any) {
    console.error("❌ Gemini API Error:", err.message);
  }
}

test();
