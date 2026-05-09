"use client";

import { FormEvent, useEffect, useState } from "react";

type PropertyFormState = {
  title: string;
  price: string;
  description: string;
  agentId: string;
  locationId: string;
  categoryId: string;
};

const initialState: PropertyFormState = {
  title: "",
  price: "",
  description: "",
  agentId: "",
  locationId: "",
  categoryId: "",
};

type AgentOption = {
  id: string;
  fullName: string;
  email: string;
};

type LocationOption = {
  id: number;
  city: string;
  area: string;
  zipCode: string;
};

type CategoryOption = {
  id: number;
  name: string;
  type: string;
};

type AddPropertyFormProps = {
  /** Called after a property is created successfully (e.g. refresh a list). */
  onPropertyCreated?: () => void;
  /** Extra classes for the form element (e.g. full width on Properties page). */
  formClassName?: string;
};

export function AddPropertyForm({ onPropertyCreated, formClassName }: AddPropertyFormProps = {}) {
  const [form, setForm] = useState<PropertyFormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const cred = { credentials: "include" as const };
        const [usersRes, locationsRes, categoriesRes] = await Promise.all([
          fetch("/api/users?role=AGENT", cred),
          fetch("/api/locations", cred),
          fetch("/api/categories", cred),
        ]);

        const usersData = (await usersRes.json()) as {
          users?: Array<{ id: string; fullName: string; email: string }>;
          error?: string;
        };
        const locationsData = (await locationsRes.json()) as {
          locations?: LocationOption[];
          error?: string;
        };
        const categoriesData = (await categoriesRes.json()) as {
          categories?: CategoryOption[];
          error?: string;
        };

        if (!usersRes.ok) {
          throw new Error(usersData.error ?? "Failed to load agents.");
        }
        if (!locationsRes.ok) {
          throw new Error(locationsData.error ?? "Failed to load locations.");
        }
        if (!categoriesRes.ok) {
          throw new Error(categoriesData.error ?? "Failed to load categories.");
        }

        const nextAgents = usersData.users ?? [];
        const nextLocations = locationsData.locations ?? [];
        const nextCategories = categoriesData.categories ?? [];

        setAgents(nextAgents);
        setLocations(nextLocations);
        setCategories(nextCategories);

        if (nextAgents.length > 0) {
          setForm((prev) => ({ ...prev, agentId: nextAgents[0].id }));
        }
        if (nextLocations.length > 0) {
          setForm((prev) => ({ ...prev, locationId: String(nextLocations[0].id) }));
        }
        if (nextCategories.length > 0) {
          setForm((prev) => ({ ...prev, categoryId: String(nextCategories[0].id) }));
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Could not load form data.");
      } finally {
        setIsLoadingAgents(false);
        setIsLoadingLookups(false);
      }
    };

    void fetchFormData();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          price: Number(form.price),
          description: form.description,
          agentId: form.agentId,
          locationId: Number(form.locationId),
          categoryId: Number(form.categoryId),
        }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create property.");
      }

      setMessage(data.message ?? "Property created.");
      onPropertyCreated?.();
      setForm((prev) => ({
        ...initialState,
        agentId: prev.agentId,
        locationId: prev.locationId,
        categoryId: prev.categoryId,
      }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={`float-in glass-panel mx-auto w-full max-w-4xl space-y-7 rounded-2xl p-7 md:p-8 ${formClassName ?? ""}`}
    >
      <div>
        <h2 className="gradient-title text-3xl font-semibold tracking-tight">Add Property</h2>
        <p className="mt-2 text-sm text-slate-300">
          Create a listing and automatically trigger your n8n workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-200">Title</span>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="app-input"
            placeholder="Modern 3-bed apartment"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-200">Price</span>
          <input
            required
            type="number"
            min="1"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            className="app-input"
            placeholder="10000000"
          />
        </label>
      </div>

      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-200">Description</span>
        <textarea
          required
          rows={4}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          className="app-input"
          placeholder="Mention rooms, amenities, and nearby landmarks."
        />
      </label>

      <label className="space-y-1">
        <span className="text-sm font-medium text-slate-200">Agent ID</span>
        <select
          required
          value={form.agentId}
          onChange={(e) => setForm((prev) => ({ ...prev, agentId: e.target.value }))}
          className="app-input"
          disabled={isLoadingAgents || agents.length === 0}
        >
          {isLoadingAgents ? <option value="">Loading agents...</option> : null}
          {!isLoadingAgents && agents.length === 0 ? (
            <option value="">No agents found. Register an agent first.</option>
          ) : null}
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.fullName} ({agent.email}) - {agent.id}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-200">Location</span>
          <select
            required
            value={form.locationId}
            onChange={(e) => setForm((prev) => ({ ...prev, locationId: e.target.value }))}
            className="app-input"
            disabled={isLoadingLookups || locations.length === 0}
          >
            {isLoadingLookups ? <option value="">Loading locations...</option> : null}
            {!isLoadingLookups && locations.length === 0 ? (
              <option value="">No locations found. Create one in Locations page.</option>
            ) : null}
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.city}, {location.area} ({location.zipCode})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm font-medium text-slate-200">Category</span>
          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            className="app-input"
            disabled={isLoadingLookups || categories.length === 0}
          >
            {isLoadingLookups ? <option value="">Loading categories...</option> : null}
            {!isLoadingLookups && categories.length === 0 ? (
              <option value="">No categories found. Create one in Categories page.</option>
            ) : null}
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} / {category.type}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-primary inline-flex items-center px-5 py-2.5 text-sm disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Creating..." : "Create Property"}
      </button>

      {message ? <p className="text-sm font-medium text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-rose-300">{error}</p> : null}
    </form>
  );
}
