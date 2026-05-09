import { CategoriesCrud } from "@/components/categories-crud";

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-8 py-6">
      <header className="glass-panel rounded-2xl p-7">
        <h1 className="gradient-title text-4xl font-semibold tracking-tight">Categories Management</h1>
        <p className="mt-2 text-slate-300">Manage category taxonomy for property classification.</p>
      </header>
      <CategoriesCrud />
    </div>
  );
}
