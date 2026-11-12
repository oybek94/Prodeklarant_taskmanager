import { describe, it, expect } from 'vitest';
import {
  canModifyNote,
  noteCreateSchema,
  noteToggleError,
  rewardPermissionError,
  type NoteForGuard,
} from './dashboard-notes.guards';

const ADMIN = { id: 1, role: 'ADMIN' };
const CREATOR = { id: 5, role: 'DEKLARANT' };
const ASSIGNEE = { id: 7, role: 'DEKLARANT' };
const OTHER = { id: 8, role: 'SELLER' };

function note(overrides: Partial<NoteForGuard> = {}): NoteForGuard {
  return {
    createdById: CREATOR.id,
    assignedToId: null,
    isCompleted: false,
    completedById: null,
    xpReward: null,
    bountyReward: null,
    ...overrides,
  };
}

describe('noteCreateSchema', () => {
  it('oddiy eslatmani qabul qiladi', () => {
    const parsed = noteCreateSchema.safeParse({ content: 'Hujjatni yubor', assignedToId: null, xpReward: null, bountyReward: null });
    expect(parsed.success).toBe(true);
  });

  it('bo\'sh matnni rad etadi', () => {
    expect(noteCreateSchema.safeParse({ content: '   ' }).success).toBe(false);
  });

  it('manfiy yoki kasr XP ni rad etadi', () => {
    expect(noteCreateSchema.safeParse({ content: 'x', xpReward: -1 }).success).toBe(false);
    expect(noteCreateSchema.safeParse({ content: 'x', xpReward: 1.5 }).success).toBe(false);
  });

  it('manfiy pul mukofotini rad etadi', () => {
    expect(noteCreateSchema.safeParse({ content: 'x', bountyReward: -5000 }).success).toBe(false);
  });
});

describe('rewardPermissionError', () => {
  it('admin bo\'lmagan xodim pul mukofoti belgilay olmaydi', () => {
    expect(rewardPermissionError('DEKLARANT', { xpReward: null, bountyReward: 5_000_000 })).not.toBeNull();
  });

  it('admin bo\'lmagan xodim XP mukofoti belgilay olmaydi', () => {
    expect(rewardPermissionError('SELLER', { xpReward: 50, bountyReward: null })).not.toBeNull();
  });

  it('mukofotsiz eslatmani har kim yarata oladi', () => {
    expect(rewardPermissionError('DEKLARANT', { xpReward: null, bountyReward: null })).toBeNull();
    expect(rewardPermissionError('DEKLARANT', { xpReward: 0, bountyReward: 0 })).toBeNull();
  });

  it('admin mukofot belgilay oladi', () => {
    expect(rewardPermissionError('ADMIN', { xpReward: 50, bountyReward: 100_000 })).toBeNull();
  });
});

describe('noteToggleError', () => {
  it('mukofotsiz eslatmani har kim belgilay oladi', () => {
    expect(noteToggleError(note(), OTHER, true)).toBeNull();
    expect(noteToggleError(note({ isCompleted: true, completedById: CREATOR.id }), OTHER, false)).toBeNull();
  });

  it('mukofotli eslatmani yaratgan xodim o\'zi yopa olmaydi', () => {
    expect(noteToggleError(note({ bountyReward: 500_000 }), CREATOR, true)).not.toBeNull();
    expect(noteToggleError(note({ xpReward: 20 }), CREATOR, true)).not.toBeNull();
  });

  it('biriktirilgan mukofotli eslatmani faqat o\'sha xodim yopadi', () => {
    const assigned = note({ bountyReward: 500_000, assignedToId: ASSIGNEE.id });
    expect(noteToggleError(assigned, ASSIGNEE, true)).toBeNull();
    expect(noteToggleError(assigned, OTHER, true)).not.toBeNull();
  });

  it('biriktirilmagan mukofotli eslatmani yaratuvchidan boshqa xodim yopa oladi', () => {
    expect(noteToggleError(note({ xpReward: 20 }), OTHER, true)).toBeNull();
  });

  it('yopilgan mukofotli eslatmani boshqa xodim o\'ziga o\'tkaza olmaydi va bekor qila olmaydi', () => {
    const done = note({ bountyReward: 500_000, isCompleted: true, completedById: ASSIGNEE.id });
    expect(noteToggleError(done, OTHER, true)).not.toBeNull();
    expect(noteToggleError(done, OTHER, false)).not.toBeNull();
    expect(noteToggleError(done, ASSIGNEE, false)).toBeNull();
  });

  it('admin har qanday eslatmani belgilay oladi', () => {
    expect(noteToggleError(note({ bountyReward: 500_000, createdById: ADMIN.id }), ADMIN, true)).toBeNull();
    expect(noteToggleError(note({ bountyReward: 500_000, isCompleted: true, completedById: ASSIGNEE.id }), ADMIN, false)).toBeNull();
  });
});

describe('canModifyNote', () => {
  it('yaratuvchi va admin tahrirlay/o\'chira oladi, boshqalar yo\'q', () => {
    expect(canModifyNote(note(), CREATOR)).toBe(true);
    expect(canModifyNote(note(), ADMIN)).toBe(true);
    expect(canModifyNote(note(), OTHER)).toBe(false);
  });
});
