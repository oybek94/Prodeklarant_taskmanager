/**
 * Branch metadata — telefon raqamlari va xarita manzillari.
 * 
 * Hozircha config fayl sifatida saqlanadi.
 * Keyinroq Branch modeliga migration qo'shib, DB da saqlash mumkin.
 */

export interface BranchMeta {
  phones: string[];
  address: string;
}

const branchMetadata: Record<string, BranchMeta> = {
  'Oltiariq': {
    phones: ['+998939079017', '+998339077778', '+998947877475'],
    address: 'https://yandex.ru/maps/-/CLWAuE5H',
  },
  'Toshkent': {
    phones: ['+998976616121', '+998939079017', '+998339077778'],
    address: 'https://yandex.ru/maps/-/CLWAy4Y9',
  },
};

/** Filial nomiga qarab metadata olish (default: Oltiariq) */
export const getBranchMeta = (branchName: string): BranchMeta => {
  return branchMetadata[branchName] || branchMetadata['Oltiariq'] || { phones: [], address: '' };
};

/** Barcha branch metadata'ni qaytarish */
export const getAllBranchMeta = (): Record<string, BranchMeta> => {
  return branchMetadata;
};
