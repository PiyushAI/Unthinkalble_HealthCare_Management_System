import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function checkFunction() {
  const res: any = await prisma.$queryRawUnsafe(`
    SELECT pg_get_functiondef(oid)
    FROM pg_proc
    WHERE proname = 'handle_new_user';
  `);
  console.log("Function definition:", res[0]?.pg_get_functiondef);
}

checkFunction().finally(() => prisma.$disconnect());
