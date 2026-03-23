import { useState, useEffect } from 'react';
import type { Task } from '../types';

export const useInvoiceStages = (task: Task | null) => {
  const [invoysStageReady, setInvoysStageReady] = useState(false);
  const [sertifikatStageCompleted, setSertifikatStageCompleted] = useState(false);
  const [taskHasErrors, setTaskHasErrors] = useState(false);

  useEffect(() => {
    const stages = (task as { stages?: Array<{ name: string; status: string }> })?.stages;
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

  return {
    invoysStageReady,
    setInvoysStageReady,
    sertifikatStageCompleted,
    setSertifikatStageCompleted,
    taskHasErrors,
    setTaskHasErrors,
  };
};
