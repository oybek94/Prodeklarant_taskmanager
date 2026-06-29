import { useMemo, useState } from 'react';
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

/**
 * Дополнительная информация modali.
 * Условия поставки, Transport raqam, FSS, og'irlik, custom maydonlar va boshqalar.
 */
export function AdditionalInfoModal({
  form,
  setForm,
  viewTab,
  canEditEffective,
  selectedContract,
  contractDeliveryTerms,
  customFields,
  setCustomFields,
  specCustomFields,
  setSpecCustomFields,
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
          <FieldRow
            label="Урожай:"
            actions={
              <>
                <button type="button" onClick={() => toggleAdditionalInfoVisible('harvestYear')} className={`${isAdditionalInfoVisible('harvestYear') ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 hover:text-gray-500'} p-0.5 rounded hover:bg-gray-100`} title={isAdditionalInfoVisible('harvestYear') ? "Invoysda yashirish" : "Invoysda ko'rsatish"}>
                  <Icon icon={isAdditionalInfoVisible('harvestYear') ? 'solar:eye-bold-duotone' : 'solar:eye-closed-bold-duotone'} className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setForm({ ...form, harvestYear: new Date().getFullYear().toString() })} className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50 text-sm font-bold" title="O'chirish">✕</button>
              </>
            }
          >
            <input type="text" value={form.harvestYear} onChange={(e) => setForm({ ...form, harvestYear: e.target.value })} className="w-full px-2.5 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </FieldRow>
        );
      default:
        if (key.startsWith('custom_')) {
          const fieldId = key.replace('custom_', '');
          const field = customFields.find(f => f.id === fieldId);
          if (!field) return null;
          return (
            <FieldRow
              label={`${field.label}:`}
              actions={
                <>
                  <button type="button" onClick={() => toggleAdditionalInfoVisible(`custom_${field.id}`)} className={`${isAdditionalInfoVisible(`custom_${field.id}`) ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 hover:text-gray-500'} p-0.5 rounded hover:bg-gray-100`} title={isAdditionalInfoVisible(`custom_${field.id}`) ? "Invoysda yashirish" : "Invoysda ko'rsatish"}>
                    <Icon icon={isAdditionalInfoVisible(`custom_${field.id}`) ? 'solar:eye-bold-duotone' : 'solar:eye-closed-bold-duotone'} className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setCustomFields(customFields.filter(f => f.id !== field.id))} className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50 text-sm font-bold" title="O'chirish">✕</button>
                </>
              }
            >
              <input
                type="text"
                value={field.value}
                onChange={(e) => setCustomFields(customFields.map(f => f.id === field.id ? { ...f, value: e.target.value } : f))}
                className="w-full px-2.5 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </FieldRow>
          );
        }
        return null;
    }
  };

  return (
    <motion.div className="invoice-additional-info-modal fixed inset-0 bg-black/50 flex items-center justify-center z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
      <motion.div className={`bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto${!canEditEffective ? ' invoice-additional-info-modal-readonly' : ''}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Дополнительная информация</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Условия поставки */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Условия поставки:<span className="text-red-500 ml-1">*</span>
              </label>
              <button type="button" onClick={() => toggleAdditionalInfoVisible('deliveryTerms')} className="text-gray-500 hover:text-gray-700 p-0.5" title={isAdditionalInfoVisible('deliveryTerms') ? "Invoysda yashirish" : "Invoysda ko'rsatish"}>
                <Icon icon={isAdditionalInfoVisible('deliveryTerms') ? 'solar:eye-bold-duotone' : 'solar:eye-closed-bold-duotone'} className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {contractDeliveryTerms.length > 0 ? (
                <>
                  <select
                    value={contractDeliveryTerms.includes(form.deliveryTerms) ? form.deliveryTerms : '__other__'}
                    onChange={(e) => {
                      const value = e.target.value;
                      const newDeliveryTerms = value === '__other__' ? '' : value;
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
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Shartnomadan tanlang...</option>
                    {contractDeliveryTerms.map((term) => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                    <option value="__other__">Boshqa (qo&apos;lda kiriting)</option>
                  </select>
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
                        className="flex-1 px-2.5 py-1 border border-gray-300 rounded-md text-sm"
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
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap"
                        >
                          Shartnomaga qo&apos;shish
                        </button>
                      )}
                    </div>
                  )}
                </>
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
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm"
                  placeholder="Условия поставки ni qo'lda kiriting (shartnomada kiritilmagan)"
                />
              )}
            </div>
          </div>

          {viewTab === 'spec' ? (
            <>
              {specCustomFields.map((field) => (
                <div key={field.id}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">{field.label}:</label>
                    <button type="button" onClick={() => setSpecCustomFields(specCustomFields.filter(f => f.id !== field.id))} className="text-red-500 hover:text-red-700 text-sm" title="O'chirish">✕</button>
                  </div>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => setSpecCustomFields(specCustomFields.map(f => f.id === field.id ? { ...f, value: e.target.value } : f))}
                    className="w-full px-2.5 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              ))}
              {canEditEffective && (
                <div className="pt-2 border-t">
                  <button type="button" onClick={onShowAddField} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2">
                    <span>+</span>
                    <span>Yangi maydon qo&apos;shish</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Место там. очистки */}
              {selectedContract && (() => {
                const customsStr = selectedContract.customsAddress || '';
                const options = [...new Set(customsStr.split('\n').map((s: string) => s.trim()).filter(Boolean))];
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <label className="block text-sm font-medium text-gray-700">Место там. очистки:</label>
                      <button type="button" onClick={() => toggleAdditionalInfoVisible('customsAddress')} className="text-gray-500 hover:text-gray-700 p-0.5" title={isAdditionalInfoVisible('customsAddress') ? "Invoysda yashirish" : "Invoysda ko'rsatish"}>
                        <Icon icon={isAdditionalInfoVisible('customsAddress') ? 'solar:eye-bold-duotone' : 'solar:eye-closed-bold-duotone'} className="w-4 h-4" />
                      </button>
                    </div>
                    {options.length > 0 ? (
                      <select value={form.customsAddress ?? ''} onChange={(e) => setForm({ ...form, customsAddress: e.target.value })} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm">
                        <option value="">Shartnomadan tanlang...</option>
                        {options.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                      </select>
                    ) : (
                      <input type="text" value={form.customsAddress ?? ''} onChange={(e) => setForm({ ...form, customsAddress: e.target.value })} placeholder="Место там. очистки" className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm" />
                    )}
                  </div>
                );
              })()}

              {/* Номер автотранспорта + Og'irliklar */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Номер автотранспорта:<span className="text-red-500 ml-1">*</span>
                    </label>
                    <button type="button" onClick={() => toggleAdditionalInfoVisible('vehicleNumber')} className="text-gray-500 hover:text-gray-700 p-0.5" title={isAdditionalInfoVisible('vehicleNumber') ? "Invoysda yashirish" : "Invoysda ko'rsatish"}>
                      <Icon icon={isAdditionalInfoVisible('vehicleNumber') ? 'solar:eye-bold-duotone' : 'solar:eye-closed-bold-duotone'} className="w-4 h-4" />
                    </button>
                  </div>
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
                    className="w-full px-2.5 py-1 border border-gray-300 rounded-md text-sm"
                  />
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Примечание:
                    </label>
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
                      className="w-full px-2.5 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="Masalan: 16400"
                    />
                  </div>
                </div>
                <div className="md:col-span-1 w-[110px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Yuk tortuvchi</label>
                  <input type="number" min={0} step="any" value={form.loaderWeight} onChange={(e) => setForm({ ...form, loaderWeight: e.target.value })} className="w-full h-[30px] px-2.5 py-1 border border-gray-300 rounded-md text-sm text-right" placeholder="кг" />
                </div>
                <div className="md:col-span-1 w-[110px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pritsep</label>
                  <input type="number" min={0} step="any" value={form.trailerWeight} onChange={(e) => setForm({ ...form, trailerWeight: e.target.value })} className="w-full h-[30px] px-2.5 py-1 border border-gray-300 rounded-md text-sm text-right" placeholder="кг" />
                </div>
                <div className="md:col-span-1 w-[110px]">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Poddon</label>
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
                    className="w-full h-[30px] px-2.5 py-1 border border-gray-300 rounded-md text-sm text-right"
                    placeholder="кг"
                  />
                </div>
              </div>

              {/* TIR / SMR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TIR №:</label>
                  <input type="text" value={form.tirNumber} onChange={(e) => setForm({ ...form, tirNumber: e.target.value })} className="w-full px-2.5 py-1 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMR №:</label>
                  <input type="text" value={form.smrNumber} onChange={(e) => setForm({ ...form, smrNumber: e.target.value })} className="w-full px-2.5 py-1 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>

              {/* Dinamik tartiblangan qo'shimcha maydonlar (Место отгрузки dan boshlab) */}
              <div className="space-y-1.5 pt-2 mt-2 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Поля документа (порядок можно изменить перетаскиванием)
                </div>
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
                      className={`flex items-center gap-2 p-1 px-2 border rounded-md transition-all ${
                        isDragging ? 'opacity-40' : ''
                      } ${
                        isDragOver ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {canEditEffective && (
                        <div
                          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 shrink-0"
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

              {/* Yangi maydon tugmasi */}
              {canEditEffective && (
                <div className="pt-2 border-t">
                  <button type="button" onClick={onShowAddField} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2">
                    <span>+</span>
                    <span>Yangi maydon qo&apos;shish</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
            Yopish
          </button>
          {canEditEffective && (
            <button type="button" onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Saqlash
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* Yordamchi inline layout komponenti */
function FieldRow({
  label,
  children,
  actions,
}: {
  label: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="w-56 shrink-0 text-sm font-medium text-gray-700 truncate" title={label}>
        {label}
      </div>
      <div className="flex-1 min-w-0">
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-1 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

/* Yordamchi ichki komponent — label + ko'z + ✕ + input */
function FieldWithVisibility({
  label,
  fieldKey,
  value,
  onChange,
  onClear,
  toggleVisible,
  isVisible,
  placeholder,
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  toggleVisible: (key: string) => void;
  isVisible: (key: string) => boolean;
  placeholder?: string;
}) {
  return (
    <FieldRow
      label={label}
      actions={
        <>
          <button
            type="button"
            onClick={() => toggleVisible(fieldKey)}
            className={`${isVisible(fieldKey) ? 'text-gray-500 hover:text-gray-700' : 'text-gray-300 hover:text-gray-500'} p-0.5 rounded hover:bg-gray-100`}
            title={isVisible(fieldKey) ? 'Invoysda yashirish' : "Invoysda ko'rsatish"}
          >
            <Icon icon={isVisible(fieldKey) ? 'mdi:eye' : 'mdi:eye-off'} className="text-lg" />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50 text-sm font-bold"
            title="O'chirish"
          >
            ✕
          </button>
        </>
      }
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder={placeholder}
      />
    </FieldRow>
  );
}
