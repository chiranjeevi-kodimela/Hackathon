import prisma from "../config/prisma.js";

export async function getAuditEvents() {
  return prisma.auditEvent.findMany({
    orderBy: { createdAt: "desc" },
  });
}
