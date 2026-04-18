// Tasks sahifasi uchun barcha TypeScript interface'lar

export interface Task {
  id: number;
  title: string;
  status: string;
  comments?: string;
  hasPsr?: boolean;
  afterHoursPayer?: 'CLIENT' | 'COMPANY';
  afterHoursDeclaration?: boolean;
  driverPhone?: string;
  createdAt: string;
  customsPaymentMultiplier?: number | null;
  client: { id: number; name: string };
  branch: { id: number; name: string };
  createdBy?: { id: number; name: string; email: string };
  stages?: Array<{ name: string; status: string; durationMin?: number | null; completedAt?: string | null }>;
}

export interface TaskStage {
  id: number;
  name: string;
  status: 'BOSHLANMAGAN' | 'TAYYOR';
  startedAt?: string;
  completedAt?: string | null;
  durationMin?: number | null;
  assignedTo?: { id: number; name: string };
}

export interface KpiLog {
  id: number;
  stageName: string;
  amount: number;
  userId: number;
  user: { id: number; name: string; email: string };
  createdAt: string;
}

export interface TaskError {
  id: number;
  stageName: string;
  workerId: number;
  amount: number;
  comment?: string;
  date: string;
  createdAt: string;
  createdById: number;
  adminRating?: number | null;
  adminRatedAt?: string | null;
  bountyRewardUzs?: number | null;
  bountyXp?: number | null;
}

export interface TaskDetail {
  id: number;
  title: string;
  status: string;
  comments?: string;
  hasPsr?: boolean;
  afterHoursPayer?: 'CLIENT' | 'COMPANY';
  afterHoursDeclaration?: boolean;
  driverPhone?: string;
  qrToken?: string | null;
  createdAt: string;
  updatedAt?: string;
  client: {
    id: number;
    name: string;
    dealAmount?: number;
    dealAmountCurrency?: 'USD' | 'UZS';
    dealAmount_currency?: 'USD' | 'UZS';
    defaultAfterHoursPayer?: 'CLIENT' | 'COMPANY' | null;
  };
  branch: { id: number; name: string };
  createdBy?: { id: number; name: string; email: string };
  updatedBy?: { id: number; name: string; email: string };
  stages: TaskStage[];
  netProfit?: number | null;
  adminEarnedAmount?: number | null;
  snapshotDealAmount?: number | null;
  snapshotCertificatePayment?: number | null;
  snapshotPsrPrice?: number | null;
  snapshotWorkerPrice?: number | null;
  snapshotCustomsPayment?: number | null;
  customsPaymentMultiplier?: number | null;
  kpiLogs?: KpiLog[];
  errors?: TaskError[];
  invoice?: {
    contractNumber?: string | null;
    contract?: { contractNumber: string; contractDate: string; emails?: string | null } | null;
  } | null;
}

export interface TaskVersion {
  id: number;
  version: number;
  title: string;
  status: string;
  comments?: string;
  hasPsr: boolean;
  driverPhone?: string;
  changes?: any;
  createdAt: string;
  changedByUser: { id: number; name: string; email: string };
}

export interface Client {
  id: number;
  name: string;
}

export interface Branch {
  id: number;
  name: string;
  phones?: string[];
  address?: string;
}

export interface TaskStats {
  yearly: { current: number; previous: number };
  monthly: { current: number; previous: number };
  weekly: { current: number; previous: number };
  daily: { current: number; previous: number };
}

export interface TasksProps {
  isModalMode?: boolean;
  modalTaskId?: number;
  onCloseModal?: () => void;
}

export interface TaskDocument {
  id: number;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  description?: string;
  documentType?: string;
  uploadedById?: number;
  uploadedBy?: { id: number; name: string };
  createdAt: string;
  archivedAt?: string;
}

export interface AiCheckError {
  field?: string;
  description?: string;
  invoice?: string;
  st?: string;
  st1?: string;
}

export interface AiCheckFinding {
  field?: string;
  severity?: 'critical' | 'warning';
  explanation?: string;
  invoice_value?: unknown;
  st_value?: unknown;
}

export interface AiCheckDetails {
  status?: 'OK' | 'ERROR' | 'XATO';
  errors?: AiCheckError[];
  findings?: AiCheckFinding[];
}

export interface AiCheck {
  id: number;
  checkType: string;
  result: 'PASS' | 'FAIL' | string;
  details: AiCheckDetails | string;
  createdAt: string;
}

export interface PreviewDocument {
  url: string;
  type: string;
  name: string;
}
