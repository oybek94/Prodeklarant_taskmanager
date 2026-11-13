import { describe, expect, it } from 'vitest';
import { canDeleteAnyLead, canDeleteLead } from '../routes/leads.guards';

describe('lid o\'chirish huquqi', () => {
  it('ADMIN va MANAGER har qanday lidni o\'chira oladi', () => {
    expect(canDeleteAnyLead('ADMIN')).toBe(true);
    expect(canDeleteAnyLead('MANAGER')).toBe(true);
    expect(canDeleteLead({ id: 1, role: 'ADMIN' }, { assignedToId: 9 })).toBe(true);
    expect(canDeleteLead({ id: 1, role: 'MANAGER' }, { assignedToId: null })).toBe(true);
  });

  it.each(['SELLER', 'DEKLARANT', 'CERTIFICATE_WORKER'])('%s faqat o\'ziga biriktirilganini o\'chiradi', (role) => {
    expect(canDeleteAnyLead(role)).toBe(false);
    expect(canDeleteLead({ id: 7, role }, { assignedToId: 7 })).toBe(true);
    expect(canDeleteLead({ id: 7, role }, { assignedToId: 8 })).toBe(false);
    expect(canDeleteLead({ id: 7, role }, { assignedToId: null })).toBe(false);
  });
});
