import { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';

/** Avtomatik yashirilgunga qadar ko'rinib turadigan vaqt */
export const NOTE_AUTO_HIDE_MS = 15000;

/** Yopilish animatsiyasi tugagach komponent DOM'dan chiqariladi */
const LEAVE_ANIMATION_MS = 220;

interface ContractRequirementsNoteProps {
  requirements?: string | null;
  clientRequirements?: string | null;
  contractNumber?: string;
  clientName?: string;
  onUpdateRequirements?: (newRequirements: string) => void | Promise<void>;
  /** Panel ko'rinishi — toolbar'dagi "Eslatma" tugmasi boshqaradi */
  open: boolean;
  onClose: () => void;
  /**
   * Invoys ochilganda panel o'zi chiqadi va {@link NOTE_AUTO_HIDE_MS} dan keyin
   * yashirinadi. Foydalanuvchi tugma orqali ochsa — `false`, ya'ni o'zi
   * yopmaguncha turaveradi.
   */
  autoHide?: boolean;
  /** Panel darhol tahrir rejimida ochilsin (eslatma qo'shish tugmasi) */
  startInEdit?: boolean;
}

export function ContractRequirementsNote({
  requirements: initialRequirements,
  clientRequirements,
  contractNumber,
  clientName,
  onUpdateRequirements,
  open,
  onClose,
  autoHide = false,
  startInEdit = false,
}: ContractRequirementsNoteProps) {
  // Boshlang'ich joylashuv — o'ng yuqori burchak, toolbar ostida. Lazy
  // initializer: aks holda birinchi kadrda panel (0,0) da chaqnab ketadi.
  const [position, setPosition] = useState<{ x: number; y: number }>(() => ({
    x: Math.max(12, window.innerWidth - 300),
    y: 84,
  }));
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValue, setEditValue] = useState(initialRequirements || '');
  const [rendered, setRendered] = useState(open);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);

  const hasContractReqs = Boolean(initialRequirements && initialRequirements.trim());
  const hasClientReqs = Boolean(clientRequirements && clientRequirements.trim());
  const canEdit = Boolean(onUpdateRequirements);

  useEffect(() => {
    setEditValue(initialRequirements || '');
  }, [initialRequirements]);

  /* ── Ochilish / yopilish ───────────────────────────────────────────────── */

  // Yopilganda darhol unmount qilinmaydi — chiqish animatsiyasi tugashi kerak
  useEffect(() => {
    if (open) {
      setRendered(true);
      return;
    }
    const timer = window.setTimeout(() => setRendered(false), LEAVE_ANIMATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Tashqaridan "tahrir rejimida ochish" so'ralganda
  useEffect(() => {
    if (open && startInEdit && canEdit) setIsEditing(true);
    if (!open) setIsEditing(false);
  }, [open, startInEdit, canEdit]);

  /* ── 15 soniyalik avtomatik yashirish ──────────────────────────────────── */

  // Sichqoncha panel ustida yoki tahrir ochiq bo'lsa — sanoq to'xtaydi
  const countdownPaused = isHovered || isEditing || isDragging;
  const remainingRef = useRef(NOTE_AUTO_HIDE_MS);
  const startedAtRef = useRef(0);

  useEffect(() => {
    if (!open || !autoHide) {
      remainingRef.current = NOTE_AUTO_HIDE_MS;
      return;
    }
    // Pauza: oldingi effektning cleanup'i qolgan vaqtni allaqachon saqlagan
    if (countdownPaused) return;

    startedAtRef.current = Date.now();
    const timer = window.setTimeout(onClose, remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
    };
  }, [open, autoHide, countdownPaused, onClose]);

  // Tahrirlash ochilganda sanoq nolga qaytadi: tahrir yopilgach progress
  // chizig'i ham qaytadan chiziladi, ya'ni chiziq va taymer mos turadi
  useEffect(() => {
    if (isEditing) remainingRef.current = NOTE_AUTO_HIDE_MS;
  }, [isEditing]);

  /* ── Tortib ko'chirish ─────────────────────────────────────────────────── */

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = noteRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const rect = noteRef.current?.getBoundingClientRect();
    const maxX = window.innerWidth - (rect?.width ?? 260);
    const maxY = window.innerHeight - 44;
    setPosition({
      x: Math.max(0, Math.min(e.clientX - dragOffset.current.x, Math.max(0, maxX))),
      y: Math.max(0, Math.min(e.clientY - dragOffset.current.y, maxY)),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  /* ── Saqlash ───────────────────────────────────────────────────────────── */

  const handleSave = async () => {
    if (!onUpdateRequirements) return;
    setSaving(true);
    try {
      await onUpdateRequirements(editValue);
      setIsEditing(false);
    } catch {
      // Xato haqidagi xabar chaqiruvchi tomonda ko'rsatiladi — tahrir ochiq qoladi
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditValue(initialRequirements || '');
    setIsEditing(false);
    // Eslatma umuman bo'lmasa, bo'sh panelni ochiq qoldirishning ma'nosi yo'q
    if (!hasContractReqs && !hasClientReqs) onClose();
  };

  const renderLines = (text: string) =>
    text.split('\n').filter((l) => l.trim()).map((line, i) => {
      const trimmed = line.trim();
      const isListItem = /^[-•*]/.test(trimmed) || /^\d+[.)]/.test(trimmed);
      return (
        <div key={i} className={`requirements-line${isListItem ? ' requirements-list-item' : ''}`}>
          {isListItem ? (
            <>
              <span className="requirements-bullet" aria-hidden="true" />
              <span>{trimmed.replace(/^[-•*]\s*|^\d+[.)]\s*/, '')}</span>
            </>
          ) : (
            <span>{trimmed}</span>
          )}
        </div>
      );
    });

  if (!rendered) return null;

  const showCountdown = open && autoHide && !isEditing;

  return (
    <div
      ref={noteRef}
      className={`contract-requirements-note ${open ? 'note-enter' : 'note-leave'}${isDragging ? ' note-dragging' : ''}`}
      style={{ left: position.x, top: position.y }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="complementary"
      aria-label="Shartnoma eslatmasi"
    >
      <div className="requirements-header" onMouseDown={handleMouseDown}>
        <span className="requirements-icon" aria-hidden="true">
          <Icon icon="solar:notes-bold-duotone" className="h-3.5 w-3.5" />
        </span>
        <span className="requirements-title">Eslatma</span>
        <div className="requirements-actions">
          {canEdit && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="requirements-action-btn"
              title="Tahrirlash"
              aria-label="Eslatmani tahrirlash"
            >
              <Icon icon="solar:pen-2-linear" className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="requirements-action-btn"
            title="Yashirish"
            aria-label="Eslatmani yashirish"
          >
            <Icon icon="solar:close-circle-linear" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="requirements-body">
        {isEditing ? (
          <div className="requirements-edit">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="requirements-textarea"
              rows={5}
              placeholder={'Shartnoma eslatmasi...\nMasalan:\n- Invoysga pechat shart\n- Yuk faqat dushanba kunlari'}
              autoFocus
            />
            <p className="requirements-hint">
              Bu eslatma
              {contractNumber ? ` ${contractNumber}-shartnomadagi` : ' shartnomadagi'} barcha invoyslarda
              ko&apos;rinadi
            </p>
            <div className="requirements-edit-actions">
              <button type="button" onClick={handleCancelEdit} className="requirements-btn-ghost" disabled={saving}>
                Bekor qilish
              </button>
              <button type="button" onClick={handleSave} className="requirements-btn-primary" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {hasContractReqs && (
              <div className="requirements-section" onDoubleClick={() => canEdit && setIsEditing(true)}>
                <div className="requirements-section-label">
                  <span>Shartnoma</span>
                  {contractNumber && <span className="requirements-badge">{contractNumber}</span>}
                </div>
                <div className="requirements-content">{renderLines(initialRequirements!)}</div>
              </div>
            )}

            {hasClientReqs && (
              <div className={`requirements-section${hasContractReqs ? ' requirements-section-border' : ''}`}>
                <div className="requirements-section-label">
                  <span>Mijoz</span>
                  {clientName && <span className="requirements-badge">{clientName}</span>}
                </div>
                <div className="requirements-content">{renderLines(clientRequirements!)}</div>
              </div>
            )}
          </>
        )}
      </div>

      {showCountdown && (
        <div className="requirements-countdown" aria-hidden="true">
          <span
            className="requirements-countdown-fill"
            style={{
              animationDuration: `${NOTE_AUTO_HIDE_MS}ms`,
              animationPlayState: countdownPaused ? 'paused' : 'running',
            }}
          />
        </div>
      )}
    </div>
  );
}
