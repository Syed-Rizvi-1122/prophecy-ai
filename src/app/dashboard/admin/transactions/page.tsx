import { DashboardTransactionsClient } from "@/components/dashboard-transactions-client";
import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";

export default async function DashboardTransactionsPage() {
  const user = await getAppUserFromSession();
  if (!user || (user.role !== "AGENT" && user.role !== "ADMIN")) {
    return null;
  }

  const propertyFilter =
    user.role === "ADMIN"
      ? { status: "AVAILABLE" as const }
      : { status: "AVAILABLE" as const, agentId: user.id };

  const transactionWhere =
    user.role === "ADMIN" ? {} : { property: { agentId: user.id } };

  const [availableProperties, transactionRows] = await Promise.all([
    prisma.property.findMany({
      where: propertyFilter,
      select: {
        id: true,
        title: true,
        price: true,
      },
      orderBy: { title: "asc" },
    }),
    prisma.transaction.findMany({
      where: transactionWhere,
      include: {
        buyer: { select: { fullName: true, email: true } },
        property: {
          include: {
            location: true,
            category: true,
            agent: { select: { fullName: true, email: true } },
          },
        },
      },
      orderBy: { transactionDate: "desc" },
    }),
  ]);

  const initialTransactions = transactionRows.map((t) => ({
    id: t.id,
    amount: t.amount.toString(),
    transactionDate: t.transactionDate.toISOString(),
    buyer: t.buyer,
    property: {
      id: t.property.id,
      title: t.property.title,
      status: t.property.status,
      location: {
        city: t.property.location.city,
        area: t.property.location.area,
      },
      category: { name: t.property.category.name, type: t.property.category.type },
      agent: t.property.agent,
    },
  }));

  return (
    <DashboardTransactionsClient
      availableProperties={availableProperties.map((p) => ({
        id: p.id,
        title: p.title,
        price: p.price.toString(),
      }))}
      initialTransactions={initialTransactions}
      isAdmin={user.role === "ADMIN"}
    />
  );
}
