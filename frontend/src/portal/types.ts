export type ShipmentStatus = 'IN_PROGRESS' | 'READY' | 'COMPLETED';

export interface CurrentStage {
  name: string;
  index: number;
}

export interface ShipmentListItem {
  id: number;
  title: string;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
  branchName: string | null;
  currentStage: CurrentStage | null;
  totalStages: number;
  doneStages: number;
  documentCount: number;
}

export interface ShipmentStage {
  id: number;
  name: string;
  order: number;
  state: 'DONE' | 'CURRENT' | 'PENDING';
  startedAt: string | null;
  completedAt: string | null;
  assigneeName: string | null;
}

export interface ShipmentDetail {
  id: number;
  title: string;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
  branchName: string | null;
  driverPhone: string | null;
  hasPsr: boolean;
  currentStage: CurrentStage | null;
  totalStages: number;
  doneStages: number;
  stages: ShipmentStage[];
}

export interface PortalDocument {
  id: string;
  shipmentId: number;
  shipmentTitle: string;
  name: string;
  type: 'INVOICE' | 'ST' | 'FITO' | 'CMR' | 'TIR' | 'OTHER' | null;
  fileType: string;
  fileSize: number | null;
  createdAt: string;
}

export interface PortalClient {
  id: number;
  name: string;
  phone: string | null;
  manager: { name: string; phone: string | null } | null;
}
