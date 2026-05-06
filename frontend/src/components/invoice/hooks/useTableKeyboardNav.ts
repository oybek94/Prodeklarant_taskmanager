import { useCallback, useRef } from 'react';

/**
 * Hook that enables arrow-key navigation between input/select cells
 * in the invoice items table.
 *
 * Each focusable cell must have:
 *   data-nav-row="<rowIndex>"    (0-based row)
 *   data-nav-col="<colIndex>"    (0-based visible-column order)
 *
 * Arrow keys move focus:
 *   ↑ / ↓  — same column, previous / next row
 *   ← / →  — same row, previous / next column (only when cursor is at
 *             the start / end of the input value, so normal text editing
 *             is not disrupted)
 *
 * Tab / Shift+Tab keep their default behaviour.
 */
export function useTableKeyboardNav() {
  const tableRef = useRef<HTMLTableElement | null>(null);

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
      const key = e.key;
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return;

      const target = e.currentTarget;
      const row = Number(target.dataset.navRow);
      const col = Number(target.dataset.navCol);
      if (isNaN(row) || isNaN(col)) return;

      // For left/right, only navigate when cursor is at the boundary
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        const el = target as HTMLInputElement;
        // selects don't have selectionStart — always navigate
        if (el.type !== 'select-one') {
          const len = (el.value ?? '').length;
          const pos = el.selectionStart ?? 0;
          if (key === 'ArrowLeft' && pos !== 0) return;
          if (key === 'ArrowRight' && pos !== len) return;
        }
      }

      let nextRow = row;
      let nextCol = col;

      switch (key) {
        case 'ArrowUp':    nextRow = row - 1; break;
        case 'ArrowDown':  nextRow = row + 1; break;
        case 'ArrowLeft':  nextCol = col - 1; break;
        case 'ArrowRight': nextCol = col + 1; break;
      }

      if (!tableRef.current) return;

      // Find the target cell
      const selector =
        `[data-nav-row="${nextRow}"][data-nav-col="${nextCol}"]`;
      const next = tableRef.current.querySelector<HTMLElement>(selector);

      if (next) {
        e.preventDefault();
        next.focus();
        // Place cursor at end for text inputs
        if (next instanceof HTMLInputElement && next.type !== 'number') {
          const len = (next.value ?? '').length;
          next.setSelectionRange(len, len);
        }
      }
    },
    [],
  );

  return { tableRef, handleCellKeyDown };
}
