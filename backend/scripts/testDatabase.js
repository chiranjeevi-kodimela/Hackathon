import prisma from "../src/config/prisma.js";

try {
  await prisma.$connect();

  console.log("MySQL connected successfully");

  const customerCount = await prisma.customer.count();

  console.log("Customers:", customerCount);
} catch (error) {
  console.error("Database connection failed:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
