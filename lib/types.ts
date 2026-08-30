export type TemplateId = "tuition" | "cleaning" | "general";
export type DocumentKind = "invoice" | "quote";
export type ProxyType = "mobile" | "uen";

export type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type Seller = {
  businessName: string;
  contactName: string;
  mobile: string;
  email: string;
  address: string;
  paynowProxy: string;
  proxyType: ProxyType;
  gstRegNo: string;
  logoDataUrl: string;
};

export type Client = {
  name: string;
  mobile: string;
  address: string;
  email: string;
};

export type DocumentMeta = {
  number: string;
  date: string;
  dueDate: string;
  notes: string;
  gstEnabled: boolean;
};

export type InvoiceDraft = {
  templateId: TemplateId;
  seller: Seller;
  client: Client;
  document: DocumentMeta;
  items: LineItem[];
};

export type Totals = {
  subtotal: number;
  gst: number;
  total: number;
};
