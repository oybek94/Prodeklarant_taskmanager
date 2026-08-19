import { useMemo, useState } from 'react';
import InvoiceFieldHint from './InvoiceFieldHint';
import type { InvoiceFieldHintKey } from '../../constants/invoiceFieldHints';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import type { Contract, CustomField, ViewTab, InvoiceFormData } from './types';

interface AdditionalInfoModalProps {
  form: InvoiceFormData;
  setForm: (form: InvoiceFormData) => void;
  viewTab: ViewTab;
  canEditEffective: boolean;
  selectedContract: Contract | null;
  contractDeliveryTerms: string[];
  customFields: CustomField[];
  setCustomFields: (fields: CustomField[]) => void;
  specCustomFields: CustomField[];
  setSpecCustomFields: (fields: CustomField[]) => void;
  packingCustomFields: CustomField[];
  setPackingCustomFields: (fields: CustomField[]) => void;
  additionalInfoError: string | null;
  setAdditionalInfoError: (err: string | null) => void;
  toggleAdditionalInfoVisible: (key: string) => void;
  isAdditionalInfoVisible: (key: string) => boolean;
  addDeliveryTermOption: (term: string) => void;
  additionalFieldsOrder: string[];
  setAdditionalFieldsOrder: (order: string[]) => void;
  onClose: () => void;
  onShowAddField: () => void;
}

/* Umumiy input uslubi — indigo accent, bitta radius shkalasi (rounded-lg) */
const inputCls =
  'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';

/* Ixcham input — Поля документа qatorlari uchun */
const inputCompactCls =
  'w-full px-2.5 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';

/**
 * Дополнительная информация modali.
 * Условия поставки, Transport raqam, FSS, og'irlik, custom maydonlar va boshqalar.
 */
export function AdditionalInfoModal({
  form,
  setForm,
  canEditEffective,
  selectedContract,
  contractDeliveryTerms,
  customFields,
  setCustomFields,
  packingCustomFields,
  setPackingCustomFields,
  additionalInfoError,
  setAdditionalInfoError,
  toggleAdditionalInfoVisible,
  isAdditionalInfoVisible,
  addDeliveryTermOption,
  additionalFieldsOrder,
  setAdditionalFieldsOrder,
  onClose,
  onShowAddField,
}: AdditionalInfoModalProps) {
  const [draggedFieldIdx, setDraggedFieldIdx] = useState<number | null>(null);
  const [dragOverFieldIdx, setDragOverFieldIdx] = useState<number | null>(null);

  const fieldOrder = useMemo(() => {
    const order = [...additionalFieldsOrder];
    const baseFields = ['shipmentPlace', 'destination', 'origin', 'manufacturer', 'orderNumber', 'gln', 'temperature', 'harvestYear'];
    const activeOrder = order.length > 0 ? order : [...baseFields];
    const customKeys = customFields.map(f => `custom_${f.id}`);
    const allActiveKeys = new Set([...baseFields, ...customKeys]);

    let merged = activeOrder.filter(key => allActiveKeys.has(key));

    customKeys.forEach(key => {
      if (!merged.includes(key)) {
        const tempIdx = merged.indexOf('temperature');
        if (tempIdx !== -1) {
          merged.splice(tempIdx, 0, key);
        } else {
          merged.push(key);
        }
      }
    });

    baseFields.forEach(key => {
      if (!merged.includes(key)) {
        merged.push(key);
      }
    });

    return merged;
  }, [additionalFieldsOrder, customFields]);

  // Helper function dynamically to update notes while keeping user custom text
  const updateNotesWithWeights = (
    currentNotes: string,
    palletW: string,
    vehicleW: string
  ): string => {
    let text = currentNotes || '';

    // Pattern to catch any previously added auto-notes
    const palletRegex = /Товары уложены на деревянных паллетах которые не являются товаром весом .*? кг\./g;
    const vehicleRegex = /Вес пустого автотранспорта без нагрузки составляет .*? кг\./g;

    text = text.replace(palletRegex, '').replace(vehicleRegex, '').trim();

    const parts = [text].filter(Boolean);

    if (palletW.trim()) {
      parts.push(`Товары уложены на деревянных паллетах которые не являются товаром весом ${palletW} кг.`);
    }
    if (vehicleW.trim()) {
      parts.push(`Вес пустого автотранспорта без нагрузки составляет ${vehicleW} кг.`);
    }

    return parts.join('\n');
  };

  const renderFieldByKey = (key: string) => {
    switch (key) {
      case 'shipmentPlace':
        return (
          <FieldWithVisibility
            label="Место отгрузки груза:"
            hint="shipmentPlace"
            fieldKey="shipmentPlace"
            value={form.shipmentPlace}
            onChange={(v) => setForm({ ...form, shipmentPlace: v })}
            onClear={() => setForm({ ...form, shipmentPlace: '' })}
            toggleVisible={toggleAdditionalInfoVisible}
            isVisible={isAdditionalInfoVisible}
          />
        );
      case 'destination':
        return (
          <FieldWithVisibility
            label="Место назначения:"
            hint="destination"
            fieldKey="destination"
            value={form.destination}
            onChange={(v) => setForm({ ...form, destination: v })}
            onClear={() => setForm({ ...form, destination: '' })}
            toggleVisible={toggleAdditionalInfoVisible}
            isVisible={isAdditionalInfoVisible}
          />
        );
      case 'origin':
        return (
          <FieldWithVisibility
            label="Происхождение товара:"
            hint="origin"
            fieldKey="origin"
            value={form.origin !== undefined ? form.origin : 'Республика Узбекистан'}
            onChange={(v) => setForm({ ...form, origin: v })}
            onClear={() => setForm({ ...form, origin: '' })}
            toggleVisible={toggleAdditionalInfoVisible}
            isVisible={isAdditionalInfoVisible}
          />
        );
      case 'manufacturer':
        return (
          <FieldWithVisibility
            label="Производитель:"
            hint="manufacturer"
            fieldKey="manufacturer"
            value={form.manufacturer}
            onChange={(v) => setForm({ ...form, manufacturer: v })}
            onClear={() => setForm({ ...form, manufacturer: '' })}
            toggleVisible={toggleAdditionalInfoVisible}
            isVisible={isAdditionalInfoVisible}
          />
        );
      case 'orderNumber':
        return (
          <FieldWithVisibility
            label="Номер заказа:"
            hint="orderNumber"
            fieldKey="orderNumber"
            value={form.orderNumber}
            onChange={(v) => setForm({ ...form, orderNumber: v })}
            onClear={() => setForm({ ...form, orderNumber: '' })}
            toggleVisible={toggleAdditionalInfoVisible}
            isVisible={isAdditionalInfoVisible}
          />
        );
      case 'gln':
        return (
          <FieldWithVisibility
            label="Глобальный идентификационный номер GS1 (GLN):"
            hint="gln"
            fieldKey="gln"
            value={form.gln}
            onChange={(v) => setForm({ ...form, gln: v })}
            onClear={() => setForm({ ...form, gln: '' })}
            toggleVisible={toggleAdditionalInfoVisible}
            isVisible={isAdditionalInfoVisible}
            placeholder="Shartnomadan olinadi yoki qo'lda yoziladi"
          />
        );
      case 'temperature':
        return (
          <FieldWithVisibility
            label="Температура:"
            hint="temperature"
            fieldKey="temperature"
            value={form.temperature || ''}
            onChange={(v) => setForm({ ...form, temperature: v })}
            onClear={() => setForm({ ...form, temperature: '' })}
            toggleVisible={toggleAdditionalInfoVisible}
            isVisible={isAdditionalInfoVisible}
            placeholder="Masalan: +2 °C"
          />
        );
      case 'harvestYear':
        return (
          <FieldBlock
            inline
            label="Урожай:"
            hint="harvestYear"
            actions={
              <>
                <EyeToggle visible={isAdditionalInfoVisible('harvestYear')} onToggle={() => toggleAdditionalInfoVisible('harvestYear')} />
                <ClearBtn onClick={() => setForm({ ...form, harvestYear: new Date().getFullYear().toString() })} />
              </>
            }
          >
            <input type="text" value={form.harvestYear} onChange={(e) => setForm({ ...form, harvestYear: e.target.value })} className={inputCompactCls} />
          </FieldBlock>
        );
      default:
        if (key.startsWith('custom_')) {
          const fieldId = key.replace('custom_', '');
          const field = customFields.find(f => f.id === fieldId);
          if (!field) return null;
          return (
            <FieldBlock
              inline
              label={`${field.label}:`}
              actions={
                <>
                  <EyeToggle visible={isAdditionalInfoVisible(`custom_${field.id}`)} onToggle={() => toggleAdditionalInfoVisible(`custom_${field.id}`)} />
                  <ClearBtn onClick={() => setCustomFields(customFields.filter(f => f.id !== field.id))} />
                </>
              }
            >
              <input
                type="text"
                value={field.value}
                onChange={(e) => setCustomFields(customFields.map(f => f.id === field.id ? { ...f, value: e.target.value } : f))}
                className={inputCompactCls}
              />
            </FieldBlock>
          );
        }
        return null;
    }
  };

  return (
    <motion.div className="invoice-additional-info-modal fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <motion.div className={`bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden${!canEditEffective ? ' invoice-additional-info-modal-readonly' : ''}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
        {/* Sticky sarlavha */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Icon icon="solar:clipboard-list-bold-duotone" className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Дополнительная информация</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0" title="Yopish">
            <Icon icon="solar:close-circle-bold-duotone" className="w-5 h-5" />
          </button>
        </div>

        {/* Scroll qismi */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* ===== Поставка ===== */}
          <SectionCard icon="solar:delivery-bold-duotone" title="Поставка">
            {/* Условия поставки */}
            <FieldBlock
              label="Условия поставки:"
              hint="deliveryTerms"
              required
              actions={<EyeToggle visible={isAdditionalInfoVisible('deliveryTerms')} onToggle={() => toggleAdditionalInfoVisible('deliveryTerms')} />}
            >
              {contractDeliveryTerms.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {contractDeliveryTerms.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          const newDeliveryTerms = term;
                          let newCustomsAddress = '';
                          if (selectedContract && newDeliveryTerms) {
                            const dtArr = (selectedContract.deliveryTerms || '').split('\n').map((s: string) => s.trim());
                            const caArr = (selectedContract.customsAddress || '').split('\n').map((s: string) => s.trim());
                            const maxLen = Math.max(dtArr.length, caArr.length);
                            while (dtArr.length < maxLen) dtArr.push('');
                            while (caArr.length < maxLen) caArr.push('');
                            const idx = dtArr.indexOf(newDeliveryTerms);
                            if (idx >= 0 && caArr[idx]?.trim()) {
                              newCustomsAddress = caArr[idx].trim();
                            }
                          }
                          setForm({ ...form, deliveryTerms: newDeliveryTerms, customsAddress: newCustomsAddress });
                          if (additionalInfoError && newDeliveryTerms.trim() && form.vehicleNumber.trim()) {
                            setAdditionalInfoError(null);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all duration-200 ${
                          form.deliveryTerms === term
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {term}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, deliveryTerms: '' })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border border-dashed transition-all duration-200 flex items-center gap-1.5 ${
                        !form.deliveryTerms || !contractDeliveryTerms.includes(form.deliveryTerms)
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                          : 'bg-gray-50 border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <Icon icon="solar:pen-new-square-line-duotone" className="w-4 h-4" />
                      Boshqa
                    </button>
                  </div>
                  {(!form.deliveryTerms || !contractDeliveryTerms.includes(form.deliveryTerms)) && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={form.deliveryTerms}
                        onChange={(e) => {
                          const value = e.target.value;
                          setForm({ ...form, deliveryTerms: value });
                          if (additionalInfoError && value.trim() && form.vehicleNumber.trim()) {
                            setAdditionalInfoError(null);
                          }
                        }}
                        placeholder="Условия поставки ni qo'lda kiriting"
                        className={inputCls + ' flex-1'}
                      />
                      {canEditEffective && (
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = form.deliveryTerms.trim();
                            if (!trimmed) return;
                            addDeliveryTermOption(trimmed);
                            setForm({ ...form, deliveryTerms: trimmed });
                          }}
                          className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 whitespace-nowrap transition-colors"
                        >
                          Shartnomaga qo&apos;shish
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={form.deliveryTerms}
                  onChange={(e) => {
                    const value = e.target.value;
                    let newCustomsAddress = '';
                    if (selectedContract && value.trim()) {
                      const dtArr = (selectedContract.deliveryTerms || '').split('\n').map((s: string) => s.trim());
                      const caArr = (selectedContract.customsAddress || '').split('\n').map((s: string) => s.trim());
                      const maxLen = Math.max(dtArr.length, caArr.length);
                      while (dtArr.length < maxLen) dtArr.push('');
                      while (caArr.length < maxLen) caArr.push('');
                      const idx = dtArr.indexOf(value.trim());
                      if (idx >= 0 && caArr[idx]?.trim()) {
                        newCustomsAddress = caArr[idx].trim();
                      }
                    }
                    setForm({ ...form, deliveryTerms: value, customsAddress: newCustomsAddress });
                    if (additionalInfoError && value.trim() && form.vehicleNumber.trim()) {
                      setAdditionalInfoError(null);
                    }
                  }}
                  required
                  className={inputCls}
                  placeholder="Условия поставки ni qo'lda kiriting (shartnomada kiritilmagan)"
                />
              )}
            </FieldBlock>

            {/* Место там. очистки */}
            {selectedContract && (() => {
              const customsStr = selectedContract.customsAddress || '';
              const options = [...new Set(customsStr.split('\n').map((s: string) => s.trim()).filter(Boolean))];
              return (
                <FieldBlock
                  label="Место там. очистки:"
                  hint="customsAddress"
                  actions={<EyeToggle visible={isAdditionalInfoVisible('customsAddress')} onToggle={() => toggleAdditionalInfoVisible('customsAddress')} />}
                >
                  {options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                      {options.map((opt, idx) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setForm({ ...form, customsAddress: opt })}
                          className={`relative flex flex-col items-start p-3 rounded-xl border transition-all duration-200 text-left group ${
                            form.customsAddress === opt
                              ? 'bg-indigo-50/60 border-indigo-500 shadow-sm'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm'
                          }`}
                          title={opt}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${form.customsAddress === opt ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}`}>
                              Manzil {idx + 1}
                            </span>
                            {form.customsAddress === opt && (
                              <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-indigo-500" />
                            )}
                          </div>
                          <span className={`text-xs leading-relaxed line-clamp-3 ${form.customsAddress === opt ? 'text-indigo-900 font-medium' : 'text-gray-600'}`}>
                            {opt}
                          </span>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          if (options.includes(form.customsAddress || '')) {
                            setForm({ ...form, customsAddress: '' });
                          }
                        }}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 min-h-[72px] ${
                          !options.includes(form.customsAddress || '')
                            ? 'bg-indigo-50/60 border-indigo-500 shadow-sm text-indigo-700'
                            : 'bg-gray-50 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <Icon icon="solar:pen-new-square-bold-duotone" className={`w-6 h-6 mb-1 ${!options.includes(form.customsAddress || '') ? 'text-indigo-500' : 'opacity-50'}`} />
                        <span className="text-xs font-medium">Boshqa kiritish</span>
                      </button>
                    </div>
                  )}
                  {(!options.includes(form.customsAddress || '') || options.length === 0) && (
                    <input type="text" value={form.customsAddress ?? ''} onChange={(e) => setForm({ ...form, customsAddress: e.target.value })} placeholder="Место там. очистки (qo'lda kiriting)" className={inputCls} />
                  )}
                </FieldBlock>
              );
            })()}
          </SectionCard>

          {/* ===== Транспорт ===== */}
          <SectionCard icon="solar:bus-bold-duotone" title="Транспорт">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <FieldBlock
                compact
                label="Номер автотранспорта:"
                hint="vehicleNumber"
                required
                actions={<EyeToggle visible={isAdditionalInfoVisible('vehicleNumber')} onToggle={() => toggleAdditionalInfoVisible('vehicleNumber')} />}
              >
                <input
                  type="text"
                  value={form.vehicleNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm({ ...form, vehicleNumber: value });
                    if (additionalInfoError && form.deliveryTerms.trim() && value.trim()) {
                      setAdditionalInfoError(null);
                    }
                  }}
                  required
                  className={inputCompactCls}
                />
              </FieldBlock>
              <FieldBlock compact label="Примечание:" hint="vehicleWeight">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={form.vehicleWeight ?? ''}
                  onChange={(e) => {
                    const vWeight = e.target.value;
                    setForm({
                      ...form,
                      vehicleWeight: vWeight,
                      notes: updateNotesWithWeights(form.notes, form.palletWeight, vWeight)
                    });
                  }}
                  className={inputCompactCls}
                  placeholder="Masalan: 16400"
                />
              </FieldBlock>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <FieldBlock compact label="Yuk tortuvchi" hint="loaderWeight">
                <input type="number" min={0} step="any" value={form.loaderWeight} onChange={(e) => setForm({ ...form, loaderWeight: e.target.value })} className={inputCompactCls + ' text-right'} placeholder="кг" />
              </FieldBlock>
              <FieldBlock compact label="Pritsep" hint="trailerWeight">
                <input type="number" min={0} step="any" value={form.trailerWeight} onChange={(e) => setForm({ ...form, trailerWeight: e.target.value })} className={inputCompactCls + ' text-right'} placeholder="кг" />
              </FieldBlock>
              <FieldBlock compact label="Poddon" hint="palletWeight">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={form.palletWeight}
                  onChange={(e) => {
                    const pWeight = e.target.value;
                    setForm({
                      ...form,
                      palletWeight: pWeight,
                      notes: updateNotesWithWeights(form.notes, pWeight, form.vehicleWeight ?? '')
                    });
                  }}
                  className={inputCompactCls + ' text-right'}
                  placeholder="кг"
                />
              </FieldBlock>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <FieldBlock compact label="TIR №:" hint="tirNumber">
                <input type="text" value={form.tirNumber} onChange={(e) => setForm({ ...form, tirNumber: e.target.value })} className={inputCompactCls} />
              </FieldBlock>
              <FieldBlock compact label="SMR №:" hint="smrNumber">
                <input type="text" value={form.smrNumber} onChange={(e) => setForm({ ...form, smrNumber: e.target.value })} className={inputCompactCls} />
              </FieldBlock>
            </div>
          </SectionCard>

          {/* ===== Поля документа ===== */}
          <SectionCard icon="solar:documents-bold-duotone" title="Поля документа" subtitle="порядок можно изменить перетаскиванием">
            <div className="space-y-1.5">
              {fieldOrder.map((key, idx) => {
                const isDragging = draggedFieldIdx === idx;
                const isDragOver = dragOverFieldIdx === idx;
                return (
                  <div
                    key={key}
                    draggable={canEditEffective}
                    onDragStart={(e) => {
                      setDraggedFieldIdx(idx);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverFieldIdx(idx);
                    }}
                    onDragEnd={() => {
                      setDraggedFieldIdx(null);
                      setDragOverFieldIdx(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedFieldIdx !== null && draggedFieldIdx !== idx) {
                        const next = [...fieldOrder];
                        const [moved] = next.splice(draggedFieldIdx, 1);
                        next.splice(idx, 0, moved);
                        setAdditionalFieldsOrder(next);
                      }
                      setDraggedFieldIdx(null);
                      setDragOverFieldIdx(null);
                    }}
                    className={`flex items-center gap-1.5 py-1 px-2 rounded-lg border ${
                      isDragging ? 'opacity-40' : ''
                    } ${
                      isDragOver ? 'border-indigo-400 bg-indigo-50/40' : 'border-gray-200 bg-white'
                    }`}
                  >
                    {canEditEffective && (
                      <div
                        className="cursor-grab active:cursor-grabbing p-0.5 text-gray-300 hover:text-indigo-500 shrink-0"
                        title="Sudrab joyini o'zgartirish"
                      >
                        <Icon icon="solar:menu-dots-bold-duotone" className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {renderFieldByKey(key)}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* ===== Упаковочный лист ===== */}
          <SectionCard
            icon="solar:box-bold-duotone"
            title="Упаковочный лист"
            subtitle="faqat «Упаковочный лист» tabida ko'rinadi"
          >
            <div className="space-y-1.5">
              {packingCustomFields.length === 0 && (
                <p className="text-xs text-gray-400">Maydon yo&apos;q</p>
              )}
              {packingCustomFields.map((field) => (
                <FieldBlock
                  key={field.id}
                  inline
                  label={`${field.label}:`}
                  actions={
                    <>
                      <EyeToggle
                        visible={isAdditionalInfoVisible(`packing_${field.id}`)}
                        onToggle={() => toggleAdditionalInfoVisible(`packing_${field.id}`)}
                      />
                      <ClearBtn onClick={() => setPackingCustomFields(packingCustomFields.filter(f => f.id !== field.id))} />
                    </>
                  }
                >
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => setPackingCustomFields(packingCustomFields.map(f => f.id === field.id ? { ...f, value: e.target.value } : f))}
                    className={inputCompactCls}
                  />
                </FieldBlock>
              ))}
            </div>
            {canEditEffective && (
              <PackingFieldAdder
                onAdd={(label) => setPackingCustomFields([...packingCustomFields, { id: Date.now().toString(), label, value: '' }])}
              />
            )}
          </SectionCard>

          {/* Yangi maydon tugmasi */}
          {canEditEffective && (
            <button type="button" onClick={onShowAddField} className="w-full px-4 py-2.5 border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all text-sm font-medium flex items-center justify-center gap-2">
              <Icon icon="solar:add-circle-bold-duotone" className="w-5 h-5" />
              <span>Yangi maydon qo&apos;shish</span>
            </button>
          )}
        </div>

        {/* Sticky footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 shrink-0 bg-white">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors">
            Yopish
          </button>
          {canEditEffective && (
            <button type="button" onClick={onClose} className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/25 active:scale-[0.98]">
              Saqlash
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Упаковочный лист uchun yangi maydon qo'shish qatori */
function PackingFieldAdder({ onAdd }: { onAdd: (label: string) => void }) {
  const [label, setLabel] = useState('');
  const add = () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setLabel('');
  };
  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            add();
          }
        }}
        placeholder="Masalan: Серийный номер датчика"
        className={inputCompactCls + ' flex-1'}
      />
      <button
        type="button"
        onClick={add}
        disabled={!label.trim()}
        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
      >
        Qo&apos;shish
      </button>
    </div>
  );
}

/* Bo'lim kartasi — ikonka + sarlavha bilan guruhlash */
function SectionCard({ icon, title, subtitle, children }: { icon: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-indigo-500 shrink-0">
          <Icon icon={icon} className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-700 leading-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400 leading-tight">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/* Maydon bloki — label tepada (default) yoki inline (label chapda, ixcham) */
function FieldBlock({
  label,
  required,
  actions,
  children,
  inline,
  compact,
  hint,
}: {
  label: string;
  required?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
  inline?: boolean;
  compact?: boolean;
  /** Maydon yonidagi "i" tugmasi uchun yordam kaliti */
  hint?: InvoiceFieldHintKey;
}) {
  if (inline) {
    return (
      <div className="flex items-center gap-2.5">
        <div className="w-44 shrink-0 flex items-center gap-1">
          <label className="min-w-0 text-xs font-medium text-gray-600 leading-tight" title={label}>
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {hint && <InvoiceFieldHint field={hint} />}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
        {actions && (
          <div className="flex items-center gap-1 shrink-0">
            {actions}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className={`flex items-start justify-between gap-2 ${compact ? 'mb-0.5' : 'mb-1'}`}>
        <div className="flex items-center gap-1 min-w-0">
          <label className={`font-medium leading-snug min-w-0 ${compact ? 'text-xs text-gray-600' : 'text-sm text-gray-700'}`}>
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {hint && <InvoiceFieldHint field={hint} />}
        </div>
        {actions && (
          <div className="flex items-center gap-1 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/* Invoysda ko'rsatish / yashirish tugmasi */
function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`${visible ? 'text-gray-400 hover:text-gray-600' : 'text-gray-300 hover:text-gray-500'} p-0.5 rounded hover:bg-gray-100 transition-colors`}
      title={visible ? 'Invoysda yashirish' : "Invoysda ko'rsatish"}
    >
      <Icon icon={visible ? 'solar:eye-bold-duotone' : 'solar:eye-closed-bold-duotone'} className="w-4 h-4" />
    </button>
  );
}

/* O'chirish / tozalash tugmasi */
function ClearBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-red-400 hover:text-red-600 p-0.5 rounded hover:bg-red-50 transition-colors"
      title="O'chirish"
    >
      <Icon icon="solar:close-circle-bold-duotone" className="w-4 h-4" />
    </button>
  );
}

/* Yordamchi ichki komponent — label tepada + ko'z + o'chirish + input */
function FieldWithVisibility({
  label,
  fieldKey,
  value,
  onChange,
  onClear,
  toggleVisible,
  isVisible,
  placeholder,
  hint,
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  toggleVisible: (key: string) => void;
  isVisible: (key: string) => boolean;
  placeholder?: string;
  hint?: InvoiceFieldHintKey;
}) {
  return (
    <FieldBlock
      inline
      label={label}
      hint={hint}
      actions={
        <>
          <EyeToggle visible={isVisible(fieldKey)} onToggle={() => toggleVisible(fieldKey)} />
          <ClearBtn onClick={onClear} />
        </>
      }
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCompactCls}
        placeholder={placeholder}
      />
    </FieldBlock>
  );
}
