import { AdminDashboard } from "@/components/admin-dashboard";
import { getDashboardStats } from "@/lib/admin/dashboard-stats";

export default async function AdminHomePage() {
  const stats = await getDashboardStats();

  return <AdminDashboard stats={stats} />;
}
