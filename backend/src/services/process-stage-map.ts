import { ProcessType } from '@prisma/client';

/**
 * Jarayon turi (TasksProcess.processType) ↔ vazifa bosqichi nomi bog'lanishi.
 * Yagona manba: routes/process.ts, services/process-reminder.ts va stage.service shu yerdan oladi.
 */
export const PROCESS_TYPE_TO_STAGE_NAMES: Record<ProcessType, string[]> = {
  TIR: ['TIR-SMR'],
  CERT: ['Zayavka'], // Sertifikat tugmasi Zayavka jarayoniga bog'langan
  DECLARATION: ['Deklaratsiya'],
};

/** Bosqich nomidan jarayon turini topadi ('Zayavka' → 'CERT'); bog'lanmagan bo'lsa undefined */
export function processTypeForStage(stageName: string): ProcessType | undefined {
  return (Object.keys(PROCESS_TYPE_TO_STAGE_NAMES) as ProcessType[]).find((type) =>
    PROCESS_TYPE_TO_STAGE_NAMES[type].includes(stageName)
  );
}
