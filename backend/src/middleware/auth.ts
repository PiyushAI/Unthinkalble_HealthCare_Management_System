import { NextFunction, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma.js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "PATIENT" | "DOCTOR" | "ADMIN";
  };
}

/**
 * Verifies the Supabase JWT from the Authorization header and attaches
 * the user + role (stored as a custom claim / app_metadata field) to req.user.
 */
export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  let role = data.user.app_metadata?.role || data.user.user_metadata?.role;
  if (!role) {
    const dbUser = await prisma.user.findUnique({ where: { id: data.user.id } });
    if (dbUser) {
      role = dbUser.role;
    }
  }

  if (!role) {
    return res.status(403).json({ error: "No role assigned to user" });
  }

  req.user = { id: data.user.id, email: data.user.email ?? "", role };
  next();
}

/** Restricts a route to one or more roles. Use after requireAuth. */
export function requireRole(...roles: Array<"PATIENT" | "DOCTOR" | "ADMIN">) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
