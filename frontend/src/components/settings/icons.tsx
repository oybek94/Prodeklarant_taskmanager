export const iconClassName = 'h-4 w-4';

export const IconAdd = () => (
  <svg viewBox="0 0 20 20" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M10 4v12M4 10h12" strokeLinecap="round" />
  </svg>
);

export const IconEdit = () => (
  <svg viewBox="0 0 20 20" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12.5 4.5 15.5 7.5" strokeLinecap="round" />
    <path d="M5 15h3l7.5-7.5-3-3L5 12v3z" strokeLinejoin="round" />
  </svg>
);

export const IconTrash = () => (
  <svg viewBox="0 0 20 20" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M4 6h12" strokeLinecap="round" />
    <path d="M7 6V4h6v2" strokeLinejoin="round" />
    <path d="M6 6l1 10h6l1-10" strokeLinejoin="round" />
  </svg>
);

export const IconSave = () => (
  <svg viewBox="0 0 20 20" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconCancel = () => (
  <svg viewBox="0 0 20 20" className={iconClassName} fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
  </svg>
);
