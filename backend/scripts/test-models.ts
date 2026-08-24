import process from "node:process";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const key = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(key);

async function testModels() {
  const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
  for (const m of models) {
    try {
      console.log("Trying model:", m);
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent("hello");
      console.log(`✅ Model ${m} worked:`, res.response.text());
      return;
    } catch (e: any) {
      console.log(`❌ Model ${m} failed:`, e.message);
    }
  }
}

testModels();
