import { lazy } from 'react';

// Kartochka (~1000 qator + hujjat tekshiruvi hisoboti) faqat vazifa ochilganda yuklanadi
const loadTaskDetailPanel = () => import('./TaskDetailPanel');

export const LazyTaskDetailPanel = lazy(loadTaskDetailPanel);

/** Vazifa bosilganda chunk'ni detail so'rovi bilan parallel yuklash uchun */
export const prefetchTaskDetailPanel = () => { void loadTaskDetailPanel(); };
