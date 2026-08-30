import type { DocumentKind, LineItem, TemplateId } from "./types";

export type TemplateDef = {
  id: TemplateId;
  name: string;
  kind: DocumentKind;
  blurb: string;
  audience: string;
  numberPrefix: "INV" | "QUO";
  defaultNotes: string;
  defaultItems: Array<Omit<LineItem, "id">>;
};

export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  tuition: {
    id: "tuition",
    name: "Tuition invoice",
    kind: "invoice",
    blurb: "Lessons, packages, and materials — ready to send after class.",
    audience: "Tutors",
    numberPrefix: "INV",
    defaultNotes: "Thank you for the term. Payment via PayNow is preferred.",
    defaultItems: [
      { description: "Weekly tuition (4 lessons)", quantity: 4, unitPrice: 50 },
    ],
  },
  cleaning: {
    id: "cleaning",
    name: "Cleaning quote",
    kind: "quote",
    blurb: "A clear quote before the job, with room for extras.",
    audience: "Cleaners",
    numberPrefix: "QUO",
    defaultNotes: "This quote is valid for 14 days. Date and time can be confirmed after acceptance.",
    defaultItems: [
      { description: "One-time deep clean (2-room flat)", quantity: 1, unitPrice: 180 },
    ],
  },
  general: {
    id: "general",
    name: "General invoice",
    kind: "invoice",
    blurb: "Property viewing fees, bakes, or any other service in SGD.",
    audience: "Agents, bakers, everyone else",
    numberPrefix: "INV",
    defaultNotes: "Thank you for your business. Please pay via PayNow.",
    defaultItems: [{ description: "Service", quantity: 1, unitPrice: 0 }],
  },
};

export const TEMPLATE_ORDER: TemplateId[] = ["tuition", "cleaning", "general"];

export function isTemplateId(value: string | null | undefined): value is TemplateId {
  return value === "tuition" || value === "cleaning" || value === "general";
}
