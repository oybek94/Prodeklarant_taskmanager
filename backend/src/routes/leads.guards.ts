/**
 * Lidni o'chirish huquqi: ADMIN/MANAGER — har qandayini, qolgan xodim — faqat o'ziga
 * biriktirilganini. Ilgari har qanday xodim barcha lidlarni (bulk-delete bilan birdaniga)
 * o'chira olardi.
 */
export const canDeleteAnyLead = (role: string): boolean => role === 'ADMIN' || role === 'MANAGER';

export const canDeleteLead = (
  user: { id: number; role: string },
  lead: { assignedToId: number | null }
): boolean => canDeleteAnyLead(user.role) || lead.assignedToId === user.id;

export const LEAD_DELETE_FORBIDDEN = "Faqat o'zingizga biriktirilgan lidni o'chira olasiz";
