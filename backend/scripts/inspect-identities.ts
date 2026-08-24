import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function inspectIdentities() {
  const cols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'identities';
  `);
  console.log("auth.identities columns:", cols);

  const existingIdentities: any = await prisma.$queryRawUnsafe(`
    SELECT * FROM auth.identities LIMIT 5;
  `);
  console.log("Existing auth.identities:", existingIdentities);
}

inspectIdentities().finally(() => prisma.$disconnect());
