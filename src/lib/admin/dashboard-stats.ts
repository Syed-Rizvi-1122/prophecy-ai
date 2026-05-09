import { prisma } from "@/lib/prisma";

export type DashboardStats = {
  users: {
    customers: number;
    agents: number;
    admins: number;
    total: number;
  };
  properties: {
    total: number;
    available: number;
    sold: number;
    rented: number;
  };
  inventoryValueAvailable: string;
  taxonomy: {
    locations: number;
    categories: number;
  };
  aiSearchQueries: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    customerRows,
    agentRows,
    adminRows,
    propertyGroups,
    totalPropertyRows,
    availableValueRows,
    locationRows,
    categoryRows,
    aiLogRows,
  ] = await Promise.all([
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM "User" WHERE "role" = 'CUSTOMER'
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM "User" WHERE "role" = 'AGENT'
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM "User" WHERE "role" = 'ADMIN'
    `,
    prisma.$queryRaw<Array<{ status: string; c: bigint }>>`
      SELECT "status"::text AS "status", COUNT(*)::bigint AS c
      FROM "Property"
      GROUP BY "status"
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM "Property"
    `,
    prisma.$queryRaw<Array<{ s: unknown }>>`
      SELECT COALESCE(SUM("price"), 0) AS s
      FROM "Property"
      WHERE "status" = 'AVAILABLE'
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM "Location"
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM "Category"
    `,
    prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*)::bigint AS n FROM "AiLog"
    `,
  ]);

  const customers = Number(customerRows[0]?.n ?? 0);
  const agents = Number(agentRows[0]?.n ?? 0);
  const admins = Number(adminRows[0]?.n ?? 0);

  const statusCounts = {
    AVAILABLE: 0,
    SOLD: 0,
    RENTED: 0,
  } as Record<"AVAILABLE" | "SOLD" | "RENTED", number>;

  for (const row of propertyGroups) {
    const st = row.status as keyof typeof statusCounts;
    if (st in statusCounts) {
      statusCounts[st] = Number(row.c);
    }
  }

  const totalProperties = Number(totalPropertyRows[0]?.n ?? 0);
  const sum = availableValueRows[0]?.s;
  const inventoryValueAvailable =
    sum !== null && sum !== undefined ? String(sum) : "0";

  return {
    users: {
      customers,
      agents,
      admins,
      total: customers + agents + admins,
    },
    properties: {
      total: totalProperties,
      available: statusCounts.AVAILABLE,
      sold: statusCounts.SOLD,
      rented: statusCounts.RENTED,
    },
    inventoryValueAvailable,
    taxonomy: {
      locations: Number(locationRows[0]?.n ?? 0),
      categories: Number(categoryRows[0]?.n ?? 0),
    },
    aiSearchQueries: Number(aiLogRows[0]?.n ?? 0),
  };
}
