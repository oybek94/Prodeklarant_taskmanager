import { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface ContractRequirementsNoteProps {
  requirements?: string | null;
  clientRequirements?: string | null;
  contractNumber?: string;
  clientName?: string;
  onUpdateRequirements?: (newRequirements: string) => void;
}

export function ContractRequirementsNote({ requirements: initialRequirements, clientRequirements, contractNumber, clientName, onUpdateRequirements }: ContractRequirementsNoteProps) {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialRequirements || '');
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);

  const hasContractReqs = initialRequirements && initialRequirements.trim().length > 0;
  const hasClientReqs = clientRequirements && clientRequirements.trim().length > 0;

  useEffect(() => {
    setEditValue(initialRequirements || '');
  }, [initialRequirements]);

  // Set initial position on mount (top-right corner, under toolbar)
  useEffect(() => {
    if (position.x === -1 && position.y === -1) {
      const x = window.innerWidth - 280;
      const y = 80;
      setPosition({ x: Math.max(10, x), y });
    }
  }, [position.x, position.y]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't start drag on buttons or interactive elements
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('textarea') || isEditing) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = noteRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, [isEditing]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    // Keep within viewport bounds
    const maxX = window.innerWidth - 60;
    const maxY = window.innerHeight - 40;
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (dismissed) return null;

  const handleSave = () => {
    if (onUpdateRequirements) {
      onUpdateRequirements(editValue);
    }
    setIsEditing(false);
  };

  const renderLines = (text: string) => {
    return text.split('\n').filter(l => l.trim()).map((line, i) => {
      const isListItem = line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*') || /^\d+\./.test(line.trim());
      return (
        <div key={i} className={`requirements-line ${isListItem ? 'requirements-list-item' : ''}`}>
          {isListItem ? (
            <>
              <span className="requirements-bullet">›</span>
              <span>{line.replace(/^[-•*]\s*|^\d+\.\s*/, '')}</span>
            </>
          ) : (
            <span>{line}</span>
          )}
        </div>
      );
    });
  };

  return (
    <div
      ref={noteRef}
      className={`contract-requirements-note ${collapsed ? 'note-collapsed' : ''} ${isDragging ? 'note-dragging' : ''}`}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        cursor: isDragging || isEditing ? 'auto' : 'grab',
        userSelect: isDragging ? 'none' : 'auto',
        minWidth: '250px',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header — always visible */}
      <div className="requirements-header">
        <div className="requirements-title">
          <Icon icon="solar:clipboard-list-bold-duotone" className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Shartnoma eslatmasi</span>
        </div>
        <div className="requirements-actions">
          {!isEditing && onUpdateRequirements && !collapsed && (
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="requirements-action-btn"
              title="Tahrirlash"
            >
              <Icon icon="solar:pen-2-bold-duotone" className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(c => !c);
            }}
            className="requirements-action-btn"
            title={collapsed ? 'Ochish' : "Yig'ish"}
          >
            <Icon icon={collapsed ? 'solar:alt-arrow-down-bold-duotone' : 'solar:alt-arrow-up-bold-duotone'} className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            className="requirements-action-btn"
            title="Yopish"
          >
            <Icon icon="solar:close-circle-bold-duotone" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content — hidden when collapsed */}
      {!collapsed && (
        <div className="requirements-body">
          {isEditing ? (
            <div className="requirements-section p-2 flex flex-col gap-2">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full text-xs p-2 border border-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 bg-amber-50"
                rows={4}
                placeholder="Shartnoma eslatmasini kiriting..."
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditValue(initialRequirements || '');
                    setIsEditing(false);
                  }}
                  className="px-2 py-1 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-2 py-1 text-xs text-white bg-amber-600 hover:bg-amber-700 rounded"
                >
                  Saqlash
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="requirements-section" onDoubleClick={() => onUpdateRequirements && setIsEditing(true)}>
                <div className="requirements-section-label">
                  <span>Shartnoma</span>
                  {contractNumber && <span className="requirements-badge">{contractNumber}</span>}
                </div>
                <div className="requirements-content">
                  {hasContractReqs ? renderLines(initialRequirements!) : (
                    <span className="text-gray-400 italic text-xs cursor-pointer" onClick={() => onUpdateRequirements && setIsEditing(true)}>
                      Eslatma yo'q. Qo'shish uchun bosing.
                    </span>
                  )}
                </div>
              </div>

              {hasClientReqs && (
                <div className={`requirements-section requirements-section-border`}>
                  <div className="requirements-section-label">
                    <span>Mijoz</span>
                    {clientName && <span className="requirements-badge">{clientName}</span>}
                  </div>
                  <div className="requirements-content">
                    {renderLines(clientRequirements!)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
