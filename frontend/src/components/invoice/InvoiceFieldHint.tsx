import React from 'react';
import FieldHint from '../common/FieldHint';
import { invoiceFieldHints, type InvoiceFieldHintKey } from '../../constants/invoiceFieldHints';

type InvoiceFieldHintProps = {
  /** `invoiceFieldHints` dagi maydon kaliti */
  field: InvoiceFieldHintKey;
  className?: string;
};

/**
 * Invoys sahifasidagi maydon yonidagi "i" tugmasi.
 *
 * `no-screenshot` klassi doim qo'shiladi — html2canvas nusxa olayotganda bu
 * tugmalar tushmasin. PDF rejimida esa `.pdf-mode button { display: none }`
 * qoidasi ularni yashiradi (invoice.css).
 */
const InvoiceFieldHint: React.FC<InvoiceFieldHintProps> = ({ field, className }) => {
  const hint = invoiceFieldHints[field];
  return (
    <FieldHint
      title={hint.title}
      text={hint.text}
      example={'example' in hint ? hint.example : undefined}
      className={`no-screenshot ${className ?? ''}`}
    />
  );
};

export default InvoiceFieldHint;
