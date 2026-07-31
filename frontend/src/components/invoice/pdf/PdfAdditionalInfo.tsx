import React, { useMemo } from 'react';
import { Text, View } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { normalizeText } from '../../../utils/textNormalize';
import { sectionFont, sectionTitleFont } from './pdfFontSizes';

interface PdfAdditionalInfoProps {
  form: any;
  viewTab: 'invoice' | 'spec' | 'packing' | 'pricelist';
  isAdditionalInfoVisible: (key: string) => boolean;
  customFields: { id: string; label: string; value: string }[];
  specCustomFields: { id: string; label: string; value: string }[];
  packingCustomFields: { id: string; label: string; value: string }[];
  additionalFieldsOrder?: string[];
  scale?: number;
  /** Qo'lda belgilangan shrift (pt); berilmasa masshtabdan hisoblanadi */
  fontSize?: number;
}

const Row: React.FC<{ label: string; value: string; scale: number; fontSize?: number }> = ({ label, value, scale, fontSize }) => {
  const sc = (v: number) => Math.round(v * scale);
  return (
    <Text style={{ fontSize: sectionFont(fontSize, 9, scale), marginBottom: sc(3), lineHeight: 1.4, color: '#000000', paddingLeft: sc(8) }}>
      <Text style={{ fontWeight: 'bold' }}>{label}: </Text>
      {normalizeText(value)}
    </Text>
  );
};

export const PdfAdditionalInfo: React.FC<PdfAdditionalInfoProps> = ({
  form,
  viewTab,
  isAdditionalInfoVisible,
  customFields,
  packingCustomFields,
  additionalFieldsOrder,
  scale = 1,
  fontSize,
}) => {
  const sc = (v: number) => Math.round(v * scale);
  const fieldOrder = useMemo(() => {
    const order = additionalFieldsOrder ? [...additionalFieldsOrder] : [];
    const baseFields = ['shipmentPlace', 'destination', 'origin', 'manufacturer', 'orderNumber', 'gln', 'temperature', 'harvestYear'];
    const activeOrder = order.length > 0 ? order : [...baseFields];
    const customKeys = customFields.map(f => `custom_${f.id}`);
    const allActiveKeys = new Set([...baseFields, ...customKeys]);

    let merged = activeOrder.filter(key => allActiveKeys.has(key));

    customKeys.forEach(key => {
      if (!merged.includes(key)) {
        const tempIdx = merged.indexOf('temperature');
        if (tempIdx !== -1) merged.splice(tempIdx, 0, key);
        else merged.push(key);
      }
    });

    baseFields.forEach(key => {
      if (!merged.includes(key)) merged.push(key);
    });

    return merged;
  }, [additionalFieldsOrder, customFields]);

  const renderFieldByKey = (key: string) => {
    switch (key) {
      case 'shipmentPlace':
        return isAdditionalInfoVisible('shipmentPlace') && form.shipmentPlace
          ? <Row key={key} label="Место отгрузки груза" value={form.shipmentPlace} scale={scale} fontSize={fontSize} />
          : null;
      case 'destination':
        return isAdditionalInfoVisible('destination') && form.destination
          ? <Row key={key} label="Место назначения" value={form.destination} scale={scale} fontSize={fontSize} />
          : null;
      case 'origin':
        return isAdditionalInfoVisible('origin')
          ? <Row key={key} label="Происхождение товара" value={form.origin || 'Республика Узбекистан'} scale={scale} fontSize={fontSize} />
          : null;
      case 'manufacturer':
        return isAdditionalInfoVisible('manufacturer') && form.manufacturer
          ? <Row key={key} label="Производитель" value={form.manufacturer} scale={scale} fontSize={fontSize} />
          : null;
      case 'orderNumber':
        return isAdditionalInfoVisible('orderNumber') && form.orderNumber
          ? <Row key={key} label="Номер заказа" value={form.orderNumber} scale={scale} fontSize={fontSize} />
          : null;
      case 'gln':
        return isAdditionalInfoVisible('gln') && form.gln
          ? <Row key={key} label="Глобальный идентификационный номер GS1 (GLN)" value={form.gln} scale={scale} fontSize={fontSize} />
          : null;
      case 'temperature':
        return isAdditionalInfoVisible('temperature') && form.temperature
          ? <Row key={key} label="Температура" value={form.temperature} scale={scale} fontSize={fontSize} />
          : null;
      case 'harvestYear':
        return isAdditionalInfoVisible('harvestYear') && form.harvestYear
          ? <Row key={key} label="Урожай" value={form.harvestYear} scale={scale} fontSize={fontSize} />
          : null;
      default:
        if (key.startsWith('custom_')) {
          const fieldId = key.replace('custom_', '');
          const field = customFields.find(f => f.id === fieldId);
          if (!field) return null;
          return isAdditionalInfoVisible(`custom_${field.id}`) && field.value
            ? <Row key={field.id} label={field.label} value={field.value} scale={scale} fontSize={fontSize} />
            : null;
        }
        return null;
    }
  };

  /* Упаковочный лист maydonlari — faqat shu tabda chiqadi */
  const visiblePackingFields =
    viewTab === 'packing'
      ? packingCustomFields.filter((f) => isAdditionalInfoVisible(`packing_${f.id}`) && !!f.value)
      : [];

  const hasAnyField =
    visiblePackingFields.length > 0 ||
    (isAdditionalInfoVisible('deliveryTerms') && !!form.deliveryTerms) ||
    (isAdditionalInfoVisible('vehicleNumber') && !!form.vehicleNumber) ||
    (isAdditionalInfoVisible('customsAddress') && !!form.customsAddress) ||
    fieldOrder.some((key) => {
      if (key === 'origin') return isAdditionalInfoVisible('origin');
      if (key.startsWith('custom_')) {
        const field = customFields.find((f) => `custom_${f.id}` === key);
        return !!field && isAdditionalInfoVisible(`custom_${field.id}`) && !!field.value;
      }
      return isAdditionalInfoVisible(key) && !!form[key];
    });

  if (!hasAnyField) return null;

  return (
    <View style={{ marginTop: sc(6), paddingBottom: sc(4) }}>
      <Text style={{ fontSize: sectionTitleFont(fontSize, 10, scale), fontWeight: 'bold', marginBottom: sc(2), color: '#1f2937' }}>
        Дополнительная информация
      </Text>

      {isAdditionalInfoVisible('deliveryTerms') && form.deliveryTerms && (
        <Row label="Условия поставки" value={form.deliveryTerms} scale={scale} fontSize={fontSize} />
      )}
      {isAdditionalInfoVisible('vehicleNumber') && form.vehicleNumber && (
        <Row label="Номер автотранспорта" value={form.vehicleNumber} scale={scale} fontSize={fontSize} />
      )}
      {isAdditionalInfoVisible('customsAddress') && form.customsAddress && (
        <Row label="Место там. очистки" value={form.customsAddress} scale={scale} fontSize={fontSize} />
      )}

      {fieldOrder.map((key) => renderFieldByKey(key))}

      {visiblePackingFields.map((field) => (
        <Row key={field.id} label={field.label} value={field.value} scale={scale} fontSize={fontSize} />
      ))}
    </View>
  );
};
