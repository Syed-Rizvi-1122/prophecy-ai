"use client";

import { useState } from "react";

import { AddPropertyForm } from "@/components/add-property-form";
import { PropertiesCrud } from "@/components/properties-crud";

export function AdminPropertiesClient() {
  const [listVersion, setListVersion] = useState(0);

  return (
    <div className="space-y-10 py-6">
      <header className="glass-panel rounded-2xl p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/85">
          Inventory
        </p>
        <h1 className="gradient-title text-4xl font-semibold tracking-tight md:text-5xl">
          Properties
        </h1>
        <p className="mt-2 max-w-3xl text-slate-300">
          Create listings (with Prisma transactions and n8n webhooks), then manage status and
          removals below.
        </p>
      </header>

      <AddPropertyForm
        formClassName="w-full max-w-none"
        onPropertyCreated={() => setListVersion((v) => v + 1)}
      />

      <PropertiesCrud refreshKey={listVersion} />
    </div>
  );
}
