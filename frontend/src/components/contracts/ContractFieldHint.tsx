import React from 'react';
import FieldHint from '../common/FieldHint';
import { contractFieldHints, type ContractFieldHintKey } from '../../constants/contractFieldHints';

type ContractFieldHintProps = {
  /** `contractFieldHints` dagi maydon kaliti */
  field: ContractFieldHintKey;
  className?: string;
};

/**
 * Shartnoma formasidagi maydon yonidagi "i" tugmasi.
 * Matnlar `constants/contractFieldHints.ts` da — bitta joyda turadi,
 * shuning uchun Mijozlar ro'yxati va mijoz sahifasidagi formalarda bir xil.
 */
const ContractFieldHint: React.FC<ContractFieldHintProps> = ({ field, className }) => {
  const hint = contractFieldHints[field];
  return <FieldHint title={hint.title} text={hint.text} example={'example' in hint ? hint.example : undefined} className={className} />;
};

export default ContractFieldHint;
