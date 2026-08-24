export interface Doctor {
  id: string;
  specialization: string;
  slotDurationMinutes?: number;
  user: { id?: string; name: string; email?: string; role?: string };
}

export interface SlotHold {
  id: string;
  doctorId: string;
  patientId: string;
  slotStart: string;
  expiresAt: string;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  slotStart: string;
  slotEnd: string;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "RESCHEDULED";
}

export interface SymptomForm {
  id: string;
  rawSymptoms: string;
  llmUrgency: "LOW" | "MEDIUM" | "HIGH" | null;
  llmChiefComplaint: string | null;
  llmQuestions: string[] | null;
  llmStatus: "PENDING" | "SUCCESS" | "FAILED";
}
