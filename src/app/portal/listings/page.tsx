import { PortalListings } from "@/components/portal-listings";
import { prisma } from "@/lib/prisma";

export default async function PortalListingsPage() {
  const [properties, reviewStats] = await Promise.all([
    prisma.property.findMany({
      where: { status: "AVAILABLE" },
      include: {
        location: true,
        category: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.groupBy({
      by: ["propertyId"],
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const statsByProperty = new Map(
    reviewStats.map((r) => [
      r.propertyId,
      {
        averageRating: r._avg.rating,
        reviewCount: r._count._all,
      },
    ]),
  );

  const initialListings = properties.map((p) => {
    const s = statsByProperty.get(p.id);
    return {
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
      reviewCount: s?.reviewCount ?? 0,
      averageRating:
        s?.averageRating !== null && s?.averageRating !== undefined
          ? Math.round(s.averageRating * 10) / 10
          : null,
    };
  });

  return <PortalListings initialListings={initialListings} />;
}
