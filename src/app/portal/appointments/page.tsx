import { PortalAppointmentsClient } from "@/components/portal-appointments-client";
import { getAppUserFromSession } from "@/lib/auth/get-app-user";
import { prisma } from "@/lib/prisma";

export default async function PortalAppointmentsPage() {
  const user = await getAppUserFromSession();
  if (!user || user.role !== "CUSTOMER") {
    return null;
  }

  const rows = await prisma.appointment.findMany({
    where: { customerId: user.id },
    include: {
      property: {
        include: {
          location: true,
          category: true,
          agent: { select: { fullName: true, email: true } },
        },
      },
    },
    orderBy: { appointmentDate: "desc" },
  });

  const initialAppointments = rows.map((a) => ({
    id: a.id,
    appointmentDate: a.appointmentDate.toISOString(),
    status: a.status,
    property: {
      id: a.property.id,
      title: a.property.title,
      price: a.property.price.toString(),
      location: {
        city: a.property.location.city,
        area: a.property.location.area,
      },
      category: { name: a.property.category.name, type: a.property.category.type },
      agent: a.property.agent,
    },
  }));

  return <PortalAppointmentsClient initialAppointments={initialAppointments} />;
}
