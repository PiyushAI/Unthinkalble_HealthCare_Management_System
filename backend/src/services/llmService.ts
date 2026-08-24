import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const anthropicApiKey = process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes("mock")
  ? process.env.ANTHROPIC_API_KEY
  : null;
const anthropic = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;

// Valid Google AI Studio API keys start with AIzaSy
const geminiApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith("AIzaSy")
  ? process.env.GEMINI_API_KEY
  : null;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

export type LLMSummaryMode = "PATIENT_FRIENDLY" | "CLINICAL_SOAP" | "BULLETED_CHECKLIST" | "REFERRAL_NOTE";

export interface PreVisitSummary {
  urgencyLevel: "LOW" | "MEDIUM" | "HIGH";
  chiefComplaint: string;
  suggestedQuestions: string[];
}

/**
 * Intelligent clinical heuristic fallback when external LLM API is unavailable or unconfigured.
 * Guarantees that pre-visit summary and urgency scoring never fail and return instantaneously.
 */
function generateHeuristicPreVisitSummary(symptoms: string): PreVisitSummary {
  const text = (symptoms || "").toLowerCase();
  
  // High urgency keywords
  const highKeywords = [
    "chest pain", "shortness of breath", "breathing difficulty", "severe bleeding", 
    "unconscious", "high fever", "seizure", "stroke", "paralysis", "excruciating"
  ];
  // Medium urgency keywords
  const mediumKeywords = [
    "fever", "cough", "vomiting", "diarrhea", "migraine", "infection", 
    "moderate pain", "rash", "dizziness", "asthma", "swelling"
  ];

  let urgencyLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (highKeywords.some((k) => text.includes(k))) {
    urgencyLevel = "HIGH";
  } else if (mediumKeywords.some((k) => text.includes(k))) {
    urgencyLevel = "MEDIUM";
  }

  let chiefComplaint = (symptoms || "").trim();
  if (chiefComplaint.length > 120) {
    chiefComplaint = chiefComplaint.substring(0, 117) + "...";
  }

  const suggestedQuestions: string[] = [];
  if (text.includes("pain") || text.includes("ache") || text.includes("headache")) {
    suggestedQuestions.push("How would you rate the pain on a scale of 1 to 10?");
    suggestedQuestions.push("Does anything specific trigger or alleviate the pain?");
  } else if (text.includes("fever") || text.includes("temperature")) {
    suggestedQuestions.push("How long has the elevated temperature been present?");
    suggestedQuestions.push("Have you experienced accompanying chills, sweats, or body aches?");
  } else if (text.includes("cough") || text.includes("breathing")) {
    suggestedQuestions.push("Is the cough productive (with phlegm) or dry?");
    suggestedQuestions.push("Are you experiencing any shortness of breath while resting or exertion?");
  } else {
    suggestedQuestions.push("When did you first notice these symptoms starting?");
    suggestedQuestions.push("Have you taken any over-the-counter medications or home treatments?");
  }

  if (suggestedQuestions.length < 3) {
    suggestedQuestions.push("Do you have any personal or family history of similar conditions?");
  }
  if (suggestedQuestions.length < 3) {
    suggestedQuestions.push("Are these symptoms interfering with your daily routine or sleep?");
  }

  return {
    urgencyLevel,
    chiefComplaint: chiefComplaint || "General medical consultation",
    suggestedQuestions: suggestedQuestions.slice(0, 3),
  };
}

/**
 * Intelligent Post-Visit Heuristic Clinical Summarizer.
 * Generates tailored formats based on LLM mode.
 */
function generateHeuristicPostVisitSummary(
  clinicalNotes: string,
  prescriptionSummaryText: string,
  mode: LLMSummaryMode
): string {
  const rxText = prescriptionSummaryText || "None prescribed at this visit.";

  switch (mode) {
    case "CLINICAL_SOAP":
      return `CLINICAL SOAP CONSULTATION RECORD
====================================
${clinicalNotes}

PRESCRIBED MEDICATIONS & REGIMEN:
${rxText}

FOLLOW-UP & MONITORING:
Patient instructed on warning signs. Return to clinic if condition deteriorates or fails to improve within expected timeframe.`;

    case "BULLETED_CHECKLIST":
      return `PATIENT ACTION PLAN & CHECKLIST
================================
1. Follow Prescribed Medication Schedule:
   ${rxText}
2. Rest & Recovery:
   - Ensure adequate hydration (at least 2-3 liters of water daily).
   - Get 8+ hours of uninterrupted rest to support immune response.
3. Activity Guidance:
   - Avoid strenuous physical exertion until fully recovered.
4. Follow-up & Red Flags:
   - Seek immediate medical attention if you experience severe shortness of breath, sustained high fever, or unexpected symptoms.`;

    case "REFERRAL_NOTE":
      return `CONSULTATION SUMMARY & REFERRAL NOTE
======================================
CLINICAL PRESENTATION & ASSESSMENT:
${clinicalNotes}

CURRENT TREATMENT & MEDICATIONS:
${rxText}

RECOMMENDATIONS FOR SPECIALIST REVIEW:
Further evaluation and management as clinically indicated. Primary consultation records and vitals available on MediFlow HIS.`;

    case "PATIENT_FRIENDLY":
    default:
      return `Hello! Here is your personalized care summary from your recent consultation:

📋 CLINICAL SUMMARY & ADVICE:
${clinicalNotes}

💊 MEDICATIONS & DOSAGE:
${rxText}

🌟 NEXT STEPS & RECOMMENDATIONS:
- Take your prescribed medications consistently with water as advised.
- Get plenty of rest, stay hydrated, and monitor your symptoms.
- If your symptoms worsen or you need any assistance, please schedule a follow-up consultation through your MediFlow patient dashboard.`;
  }
}

/**
 * Pre-visit LLM call.
 */
export async function generatePreVisitSummary(
  symptoms: string
): Promise<PreVisitSummary> {
  const prompt = `Analyse these symptoms and return ONLY a JSON object with keys "urgencyLevel" (one of "LOW","MEDIUM","HIGH"), "chiefComplaint" (string), and "suggestedQuestions" (array of exactly 3 short strings for the doctor to ask). No markdown code blocks, no other text.
Symptoms: ${symptoms}`;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
      const resPromise = model.generateContent(prompt);
      const result: any = await Promise.race([resPromise, timeoutPromise]);
      const text = result.response.text();
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned) as PreVisitSummary;
      if (parsed && parsed.urgencyLevel && parsed.chiefComplaint && Array.isArray(parsed.suggestedQuestions)) {
        return parsed;
      }
    } catch (err) {
      console.warn("Gemini call skipped/failed, using clinical heuristic analyzer");
    }
  }

  return generateHeuristicPreVisitSummary(symptoms);
}

/**
 * Post-visit LLM call with customizable mode.
 */
export async function generatePostVisitSummary(
  clinicalNotes: string,
  prescriptionSummaryText: string,
  mode: LLMSummaryMode = "PATIENT_FRIENDLY"
): Promise<string> {
  let promptInstruction = "";
  switch (mode) {
    case "CLINICAL_SOAP":
      promptInstruction = "Format these notes into an organized medical SOAP summary for physician records.";
      break;
    case "BULLETED_CHECKLIST":
      promptInstruction = "Convert these clinical notes into a concise, numbered action checklist with medication schedule and follow-up deadlines for the patient.";
      break;
    case "REFERRAL_NOTE":
      promptInstruction = "Convert these clinical notes and prescription into a formal clinical consultation summary suitable for a specialist referral.";
      break;
    case "PATIENT_FRIENDLY":
    default:
      promptInstruction = "Convert these clinical notes into a warm, patient-friendly care summary with medication schedule and clear follow-up steps.";
      break;
  }

  const prompt = `${promptInstruction}
Clinical notes: ${clinicalNotes}
Prescription: ${prescriptionSummaryText || "None"}`;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
      const resPromise = model.generateContent(prompt);
      const result: any = await Promise.race([resPromise, timeoutPromise]);
      const text = result.response.text();
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (err) {
      console.warn("Gemini call skipped/failed, using clinical heuristic summarizer");
    }
  }

  return generateHeuristicPostVisitSummary(clinicalNotes, prescriptionSummaryText, mode);
}
