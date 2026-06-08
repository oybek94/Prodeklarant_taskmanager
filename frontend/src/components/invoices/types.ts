export interface Invoice {
  id: number;
  invoiceNumber: string;
  contractNumber?: string;
  contractId?: number;
  taskId: number;
  clientId: number;
  date: string;
  currency: string;
  totalAmount: number;
  additionalInfo?: { vehicleNumber?: string; trailerNumber?: string; [k: string]: unknown };
  task?: {
    id: number;
    title: string;
    status: string;
    branch?: { id: number; name: string };
    stages?: { name: string; status: string }[];
    _count?: { errors: number };
  };
  client?: {
    id: number;
    name: string;
  };
  contract?: {
    sellerName: string;
    buyerName: string;
    consigneeName?: string | null;
    contractCurrency?: string | null;
  };
  branch?: {
    id: number;
    name: string;
  };
}

export interface Client {
  id: number;
  name: string;
}

export interface Contract {
  id: number;
  contractNumber: string;
  contractDate: string;
  sellerName: string;
  buyerName: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface Worker {
  id: number;
  name: string;
  role?: string;
}

export interface InvoicesFilters {
  branchId: string;
  clientId: string;
  startDate: string;
  endDate: string;
}
