import { describe, it, expect } from 'vitest';
import { shouldDeductGovernmentFees, computeContractPaymentSplit } from '../services/contract-payment-split';

describe('shouldDeductGovernmentFees', () => {
  it('CASH_ALL_INCLUSIVE uchun true qaytaradi (legacy xatti-harakat)', () => {
    expect(shouldDeductGovernmentFees('CASH_ALL_INCLUSIVE')).toBe(true);
  });

  it('TRANSFER_ONLY uchun false qaytaradi', () => {
    expect(shouldDeductGovernmentFees('TRANSFER_ONLY')).toBe(false);
  });

  it('CASH_ONLY uchun false qaytaradi', () => {
    expect(shouldDeductGovernmentFees('CASH_ONLY')).toBe(false);
  });

  it('MIXED uchun false qaytaradi', () => {
    expect(shouldDeductGovernmentFees('MIXED')).toBe(false);
  });
});

describe('computeContractPaymentSplit', () => {
  it('CASH_ALL_INCLUSIVE: hammasi naqt', () => {
    expect(computeContractPaymentSplit('CASH_ALL_INCLUSIVE', 1000000, null)).toEqual({
      cashAmount: 1000000,
      transferAmount: 0,
    });
  });

  it('CASH_ONLY: hammasi naqt', () => {
    expect(computeContractPaymentSplit('CASH_ONLY', 1000000, null)).toEqual({
      cashAmount: 1000000,
      transferAmount: 0,
    });
  });

  it('TRANSFER_ONLY: hammasi perechisleniya', () => {
    expect(computeContractPaymentSplit('TRANSFER_ONLY', 1000000, null)).toEqual({
      cashAmount: 0,
      transferAmount: 1000000,
    });
  });

  it('MIXED: konfiguratsiya qilingan summa perechisleniya, qolgani naqt', () => {
    expect(computeContractPaymentSplit('MIXED', 1000000, 400000)).toEqual({
      cashAmount: 600000,
      transferAmount: 400000,
    });
  });

  it('MIXED: transfer summasi dealAmount dan katta bo\'lsa, naqt manfiy bo\'lmaydi (clamp)', () => {
    expect(computeContractPaymentSplit('MIXED', 1000000, 1500000)).toEqual({
      cashAmount: 0,
      transferAmount: 1000000,
    });
  });

  it('MIXED: transfer konfiguratsiyasi bo\'lmasa (null), hammasi naqt', () => {
    expect(computeContractPaymentSplit('MIXED', 1000000, null)).toEqual({
      cashAmount: 1000000,
      transferAmount: 0,
    });
  });

  it('MIXED: manfiy konfiguratsiya 0 sifatida ishlov beriladi', () => {
    expect(computeContractPaymentSplit('MIXED', 1000000, -500)).toEqual({
      cashAmount: 1000000,
      transferAmount: 0,
    });
  });
});
