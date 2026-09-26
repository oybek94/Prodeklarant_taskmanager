import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import apiClient from '../../lib/api';
import { buildListParams } from './listParams';
import type { Transaction, TransactionFilters } from './types';

const SEARCH_DEBOUNCE_MS = 350;

/** Ro'yxat: izoh qidiruvi debounce qilinadi, eski so'rov yangisi kelganda bekor qilinadi. */
export function useTransactionsList(filters: TransactionFilters, page: number, pageSize: number) {
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(filters.search);
  const [reloadKey, setReloadKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(filters.search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [filters.search]);

  const { startDate, endDate, type, clientId, workerId, paymentMethod } = filters;
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    const params = buildListParams({ startDate, endDate, type, clientId, workerId, paymentMethod, search }, page, pageSize);
    apiClient
      .get(`/transactions?${params.toString()}`, { signal: controller.signal })
      .then(({ data }) => {
        setItems(Array.isArray(data?.data) ? data.data : []);
        setTotal(Number(data?.total ?? 0));
        setTotalPages(Math.max(1, Number(data?.totalPages ?? 1)));
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (axios.isCancel(error)) return;
        console.error('Tranzaksiyalarni yuklashda xato:', error);
        setItems([]);
        setLoading(false);
      });
    return () => controller.abort();
  }, [startDate, endDate, type, clientId, workerId, paymentMethod, search, page, pageSize, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { items, total, totalPages, loading, reload };
}
