import { InvoiceApp } from "@/components/InvoiceApp";
import { isTemplateId } from "@/lib/templates";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const params = await searchParams;
  const templateId = isTemplateId(params.template) ? params.template : "general";
  return <InvoiceApp key={templateId} initialTemplateId={templateId} />;
}
