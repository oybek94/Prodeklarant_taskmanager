import { useState, useEffect, useMemo } from 'react';
import type { Task } from '../types';

interface RawStage {
  name: string;
  status: string;
  stageOrder?: number;
}

/**
 * Task hozir qaysi bosqichda turgani.
 *
 * `label` — TAYYOR bo'lmagan BIRINCHI bosqich nomi (masalan "Sertifikat olib
 * chiqish"), ya'ni ish hozir qayerda turibdi. Hamma bosqich tugagan bo'lsa
 * `label = 'Yakunlandi'` va `done = true`.
 */
export interface TaskStageSummary {
  label: string;
  done: boolean;
}

export const useInvoiceStages = (task: Task | null) => {
  const [invoysStageReady, setInvoysStageReady] = useState(false);
  const [sertifikatStageCompleted, setSertifikatStageCompleted] = useState(false);
  const [taskHasErrors, setTaskHasErrors] = useState(false);

  useEffect(() => {
    const stages = (task as { stages?: RawStage[] })?.stages;
    const errors = (task as { errors?: unknown[] })?.errors;

    if (stages && Array.isArray(stages)) {
      const invoys = stages.find((s) => s.name === 'Invoys');
      setInvoysStageReady(!!invoys && invoys.status === 'TAYYOR');

      const sertifikat = stages.find((s) => String(s.name).trim() === 'Sertifikat olib chiqish');
      setSertifikatStageCompleted(!!sertifikat && sertifikat.status === 'TAYYOR');
    } else {
      setInvoysStageReady(false);
      setSertifikatStageCompleted(false);
    }

    setTaskHasErrors(Array.isArray(errors) && errors.length > 0);
  }, [task]);

  /**
   * Bu qiymat state'da SAQLANMAYDI, har safar qayta hisoblanadi:
   * `setInvoysStageReady(true)` bosqich tayyor qilinganda optimistik
   * chaqiriladi (`useInvoiceContract.handleMarkInvoysReady`) va `task` qayta
   * yuklanmaydi — saqlangan matn esa o'sha paytda eskirib qolardi. Shuning
   * uchun "Invoys" bosqichi shu bayroq bo'yicha tayyor deb hisoblanadi.
   */
  const stageSummary = useMemo<TaskStageSummary | null>(() => {
    const stages = (task as { stages?: RawStage[] })?.stages;
    if (!Array.isArray(stages) || stages.length === 0) return null;

    // API `stageOrder` bo'yicha tartiblab beradi (tasks.ts), lekin boshqa
    // manbadan kelsa ham to'g'ri ishlashi uchun qayta tartiblaymiz
    const ordered = [...stages].sort((a, b) => (a.stageOrder ?? 0) - (b.stageOrder ?? 0));

    const pending = ordered.find((s) => {
      if (s.name === 'Invoys' && invoysStageReady) return false;
      return s.status !== 'TAYYOR';
    });

    return pending ? { label: pending.name, done: false } : { label: 'Yakunlandi', done: true };
  }, [task, invoysStageReady]);

  return {
    stageSummary,
    invoysStageReady,
    setInvoysStageReady,
    sertifikatStageCompleted,
    setSertifikatStageCompleted,
    taskHasErrors,
    setTaskHasErrors,
  };
};
