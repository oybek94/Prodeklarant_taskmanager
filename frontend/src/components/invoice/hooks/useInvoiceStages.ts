import { useState, useEffect } from 'react';
import type { Task } from '../types';

export const useInvoiceStages = (task: Task | null) => {
  /**
   * Taskda "Invoys" bosqichi bormi. Holat NOMINI bu yerda saqlamaymiz —
   * `setInvoysStageReady(true)` bosqich tayyor qilinganda optimistik
   * chaqiriladi (`useInvoiceContract.handleMarkInvoysReady`), ya'ni alohida
   * saqlangan status matni task qayta yuklanmaguncha eskirib qolardi.
   * `StageStatus` enum'i ikki qiymatli (BOSHLANMAGAN | TAYYOR), shuning uchun
   * ko'rsatiladigan nom `invoysStageReady` dan kelib chiqadi.
   */
  const [hasInvoysStage, setHasInvoysStage] = useState(false);
  const [invoysStageReady, setInvoysStageReady] = useState(false);
  const [sertifikatStageCompleted, setSertifikatStageCompleted] = useState(false);
  const [taskHasErrors, setTaskHasErrors] = useState(false);

  useEffect(() => {
    const stages = (task as { stages?: Array<{ name: string; status: string }> })?.stages;
    const errors = (task as { errors?: unknown[] })?.errors;

    if (stages && Array.isArray(stages)) {
      const invoys = stages.find((s) => s.name === 'Invoys');
      setHasInvoysStage(!!invoys);
      setInvoysStageReady(!!invoys && invoys.status === 'TAYYOR');

      const sertifikat = stages.find((s) => String(s.name).trim() === 'Sertifikat olib chiqish');
      setSertifikatStageCompleted(!!sertifikat && sertifikat.status === 'TAYYOR');
    } else {
      setHasInvoysStage(false);
      setInvoysStageReady(false);
      setSertifikatStageCompleted(false);
    }

    setTaskHasErrors(Array.isArray(errors) && errors.length > 0);
  }, [task]);

  return {
    hasInvoysStage,
    invoysStageReady,
    setInvoysStageReady,
    sertifikatStageCompleted,
    setSertifikatStageCompleted,
    taskHasErrors,
    setTaskHasErrors,
  };
};
