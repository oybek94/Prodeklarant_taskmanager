import { useState, useRef, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';

interface ContractRequirementsNoteProps {
  requirements?: string | null;
  clientRequirements?: string | null;
  contractNumber?: string;
  clientName?: string;
}

export function ContractRequirementsNote({ requirements, clientRequirements, contractNumber, clientName }: ContractRequirementsNoteProps) {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);

  const hasContractReqs = requirements && requirements.trim().length > 0;
  const hasClientReqs = clientRequirements && clientRequirements.trim().length > 0;

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
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = noteRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

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

  if ((!hasContractReqs && !hasClientReqs) || dismissed) return null;

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
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: isDragging ? 'none' : 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header — always visible */}
      <div className="requirements-header">
        <div className="requirements-title">
          <Icon icon="lucide:clipboard-list" className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Talablar</span>
        </div>
        <div className="requirements-actions">
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            className="requirements-action-btn"
            title={collapsed ? 'Ochish' : 'Yig\'ish'}
          >
            <Icon icon={collapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'} className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="requirements-action-btn"
            title="Yopish"
          >
            <Icon icon="lucide:x" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content — hidden when collapsed */}
      {!collapsed && (
        <div className="requirements-body">
          {hasContractReqs && (
            <div className="requirements-section">
              <div className="requirements-section-label">
                <span>Shartnoma</span>
                {contractNumber && <span className="requirements-badge">{contractNumber}</span>}
              </div>
              <div className="requirements-content">
                {renderLines(requirements!)}
              </div>
            </div>
          )}

          {hasClientReqs && (
            <div className={`requirements-section ${hasContractReqs ? 'requirements-section-border' : ''}`}>
              <div className="requirements-section-label">
                <span>Mijoz</span>
                {clientName && <span className="requirements-badge">{clientName}</span>}
              </div>
              <div className="requirements-content">
                {renderLines(clientRequirements!)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
