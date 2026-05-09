import { PortalListings } from "@/components/portal-listings";
import { prisma } from "@/lib/prisma";

export default async function PortalListingsPage() {
  const properties = await prisma.property.findMany({
    where: { status: "AVAILABLE" },
    include: {
      location: true,
      category: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const initialListings = properties.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    price: p.price.toString(),
    status: p.status,
    location: {
      city: p.location.city,
      area: p.location.area,
      zipCode: p.location.zipCode,
    },
    category: {
      name: p.category.name,
      type: p.category.type,
    },
  }));

  return <PortalListings initialListings={initialListings} />;
}
