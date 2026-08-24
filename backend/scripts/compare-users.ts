import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function inspectUser() {
  const realUser: any = await prisma.$queryRawUnsafe(`
    SELECT * FROM auth.users WHERE email = 'piyushcricketfan619@gmail.com';
  `);
  console.log("Real working user in auth.users:", JSON.stringify(realUser, null, 2));

  const ourUser: any = await prisma.$queryRawUnsafe(`
    SELECT * FROM auth.users WHERE email = 'dr.jenkins@hospital.com';
  `);
  console.log("Our user in auth.users:", JSON.stringify(ourUser, null, 2));
}

inspectUser().finally(() => prisma.$disconnect());
