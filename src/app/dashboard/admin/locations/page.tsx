import { LocationsCrud } from "@/components/locations-crud";

export default function AdminLocationsPage() {
  return (
    <div className="space-y-8 py-6">
      <header className="glass-panel rounded-2xl p-7">
        <h1 className="gradient-title text-4xl font-semibold tracking-tight">Locations Management</h1>
        <p className="mt-2 text-slate-300">Maintain normalized city/area/zip records used by properties.</p>
      </header>
      <LocationsCrud />
    </div>
  );
}
