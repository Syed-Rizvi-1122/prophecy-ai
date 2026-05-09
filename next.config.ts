import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/users", destination: "/dashboard/admin/users", permanent: false },
      { source: "/properties", destination: "/dashboard/admin/properties", permanent: false },
      { source: "/locations", destination: "/dashboard/admin/locations", permanent: false },
      { source: "/categories", destination: "/dashboard/admin/categories", permanent: false },
    ];
  },
};

export default nextConfig;
