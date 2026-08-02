import apiClient from '../../lib/api';
import type { AgreementInput, AgreementListResponse, ServiceAgreement } from './types';

const BASE = '/service-agreements';

export async function listAgreements(params: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AgreementListResponse> {
  const { data } = await apiClient.get<AgreementListResponse>(BASE, { params });
  return data;
}

export async function getAgreement(id: number): Promise<ServiceAgreement> {
  const { data } = await apiClient.get<ServiceAgreement>(`${BASE}/${id}`);
  return data;
}

export async function getNextNumber(year: number): Promise<string> {
  const { data } = await apiClient.get<{ agreementNumber: string }>(`${BASE}/next-number`, {
    params: { year },
  });
  return data.agreementNumber;
}

export async function createAgreement(input: AgreementInput): Promise<ServiceAgreement> {
  const { data } = await apiClient.post<ServiceAgreement>(BASE, input);
  return data;
}

export async function updateAgreement(id: number, input: Partial<AgreementInput>): Promise<ServiceAgreement> {
  const { data } = await apiClient.patch<ServiceAgreement>(`${BASE}/${id}`, input);
  return data;
}

export async function terminateAgreement(id: number, terminationReason: string): Promise<ServiceAgreement> {
  const { data } = await apiClient.post<ServiceAgreement>(`${BASE}/${id}/terminate`, { terminationReason });
  return data;
}
