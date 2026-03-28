import { useState } from 'react';
import { Icon } from '@iconify/react';

interface ContractRequirementsNoteProps {
  requirements: string;
  contractNumber?: string;
}

export function ContractRequirementsNote({ requirements, contractNumber }: ContractRequirementsNoteProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!requirements?.trim() || dismissed) return null;

  const lines = requirements.split('\n').filter(l => l.trim());

  return (
    <div className="contract-requirements-note">
      {/* Pin icon decoration */}
      <div className="requirements-pin">
        <Icon icon="lucide:pin" className="w-4 h-4" />
      </div>

      {/* Header */}
      <div className="requirements-header">
        <div className="requirements-title">
          <Icon icon="lucide:clipboard-list" className="w-4 h-4 flex-shrink-0" />
          <span>Shartnoma talablari</span>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="requirements-close"
          title="Yopish"
        >
          <Icon icon="lucide:x" className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Contract number badge */}
      {contractNumber && (
        <div className="requirements-contract-badge">
          {contractNumber}
        </div>
      )}

      {/* Content */}
      <div className="requirements-content">
        {lines.map((line, i) => {
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
        })}
      </div>
    </div>
  );
}
