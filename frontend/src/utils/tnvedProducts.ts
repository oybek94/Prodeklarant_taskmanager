import apiClient from '../lib/api';

export interface TnvedProduct {
  id: string;
  name: string;
  code: string;
  botanicalName?: string;
}

// ---- API-based CRUD (serverda saqlanadi) ----

/** Barcha TNVED mahsulotlarni serverdan olish */
export async function getTnvedProducts(): Promise<TnvedProduct[]> {
  try {
    const res = await apiClient.get<TnvedProduct[]>('/tnved-products');
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

/** Yangi TNVED mahsulot qo'shish */
export async function addTnvedProduct(
  name: string,
  code: string,
  botanicalName?: string,
): Promise<TnvedProduct | null> {
  try {
    const res = await apiClient.post<TnvedProduct>('/tnved-products', {
      name: name.trim(),
      code: code.trim(),
      botanicalName: botanicalName?.trim() || undefined,
    });
    return res.data;
  } catch {
    return null;
  }
}

/** TNVED mahsulotni yangilash */
export async function updateTnvedProduct(
  id: string,
  name: string,
  code: string,
  botanicalName?: string,
): Promise<void> {
  await apiClient.put(`/tnved-products/${id}`, {
    name: name.trim(),
    code: code.trim(),
    botanicalName: botanicalName?.trim() || null,
  });
}

/** TNVED mahsulotni o'chirish */
export async function deleteTnvedProduct(id: string): Promise<void> {
  await apiClient.delete(`/tnved-products/${id}`);
}

/** Standart (default) TNVED mahsulotlar — masofaviy serverdan */
export async function getDefaultTnvedProducts(): Promise<TnvedProduct[]> {
  return getTnvedProducts();
}
