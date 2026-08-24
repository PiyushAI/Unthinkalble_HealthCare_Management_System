import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function checkTriggers() {
  const triggers: any = await prisma.$queryRawUnsafe(`
    SELECT event_object_schema, event_object_table, trigger_name, action_statement, action_orientation, action_timing
    FROM information_schema.triggers
    WHERE event_object_schema = 'auth';
  `);
  console.log("Triggers on auth schema:", JSON.stringify(triggers, null, 2));
}

checkTriggers().finally(() => prisma.$disconnect());
