import React from 'react';
import { AnimatePresence } from 'framer-motion';
import type { RegionCode, ViewTab, Contract, CustomField, FssFilePrefix } from './types';
import { AdditionalInfoModal } from './AdditionalInfoModal';
import { FssRegionModal } from './FssRegionModal';
import { AddFieldModal } from './AddFieldModal';
import { CargoImportModal } from './CargoImportModal';
import type { CargoPreviewRow } from './useCargoImport';

interface InvoiceModalsProps {
  showAdditionalInfoModal: boolean;
  setShowAdditionalInfoModal: (val: boolean) => void;
  form: any;
  setForm: (form: any) => void;
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

  showFssRegionModal: boolean;
  setShowFssRegionModal: (val: boolean) => void;
  regionCodes: RegionCode[];
  regionCodesLoading: boolean;
  regionSearch: string;
  setRegionSearch: (search: string) => void;
  fssAutoDownload: boolean;
  fssFilePrefix: FssFilePrefix;
  handleSubmit: (e?: React.FormEvent, submitForm?: any, fastSave?: boolean) => Promise<void>;
  generateFssExcel: (opts: { internalCode: string; name: string; externalCode: string; filePrefix: FssFilePrefix; templateType: 'ichki' | 'tashqi' }) => void;
  loadRegionCodes: () => void;

  showAddFieldModal: boolean;
  setShowAddFieldModal: (val: boolean) => void;
  newFieldLabel: string;
  setNewFieldLabel: (label: string) => void;
  additionalFieldsOrder: string[];
  setAdditionalFieldsOrder: (order: string[]) => void;

  showCargoImportModal: boolean;
  setShowCargoImportModal: (val: boolean) => void;
  cargoImport: {
    text: string;
    setText: (v: string) => void;
    loading: boolean;
    rows: CargoPreviewRow[];
    selectedKeys: Set<string>;
    toggleKey: (key: string) => void;
    toggleAll: (checked: boolean) => void;
    analyze: () => void;
    applyCargo: () => void;
    reset: () => void;
  };
}

export const InvoiceModals: React.FC<InvoiceModalsProps> = ({
  showAdditionalInfoModal,
  setShowAdditionalInfoModal,
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
  packingCustomFields,
  setPackingCustomFields,
  additionalInfoError,
  setAdditionalInfoError,
  toggleAdditionalInfoVisible,
  isAdditionalInfoVisible,
  addDeliveryTermOption,
  additionalFieldsOrder,
  setAdditionalFieldsOrder,

  showFssRegionModal,
  setShowFssRegionModal,
  regionCodes,
  regionCodesLoading,
  regionSearch,
  setRegionSearch,
  fssAutoDownload,
  fssFilePrefix,
  handleSubmit,
  generateFssExcel,
  loadRegionCodes,

  showAddFieldModal,
  setShowAddFieldModal,
  newFieldLabel,
  setNewFieldLabel,

  showCargoImportModal,
  setShowCargoImportModal,
  cargoImport,
}) => {
  return (
    <>
      <AnimatePresence>
        {showAdditionalInfoModal && (
          <AdditionalInfoModal
            form={form}
            setForm={setForm}
            viewTab={viewTab}
            canEditEffective={canEditEffective}
            selectedContract={selectedContract}
            contractDeliveryTerms={contractDeliveryTerms}
            customFields={customFields}
            setCustomFields={setCustomFields}
            specCustomFields={specCustomFields}
            setSpecCustomFields={setSpecCustomFields}
            packingCustomFields={packingCustomFields}
            setPackingCustomFields={setPackingCustomFields}
            additionalInfoError={additionalInfoError}
            setAdditionalInfoError={setAdditionalInfoError}
            toggleAdditionalInfoVisible={toggleAdditionalInfoVisible}
            isAdditionalInfoVisible={isAdditionalInfoVisible}
            addDeliveryTermOption={addDeliveryTermOption}
            additionalFieldsOrder={additionalFieldsOrder}
            setAdditionalFieldsOrder={setAdditionalFieldsOrder}
            onClose={() => setShowAdditionalInfoModal(false)}
            onShowAddField={() => setShowAddFieldModal(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFssRegionModal && (
          <FssRegionModal
            regionCodes={regionCodes}
            regionCodesLoading={regionCodesLoading}
            regionSearch={regionSearch}
            setRegionSearch={setRegionSearch}
            currentRegionName={form.fssRegionName}
            currentRegionInternalCode={form.fssRegionInternalCode}
            onSelect={async (region) => {
              const nextForm = {
                ...form,
                fssRegionInternalCode: region.internalCode,
                fssRegionName: region.name,
                fssRegionExternalCode: region.externalCode,
              };
              setForm(nextForm);
              setShowFssRegionModal(false);
              setRegionSearch('');
              await handleSubmit(undefined, nextForm, true);
              if (fssAutoDownload) {
                generateFssExcel({
                  internalCode: region.internalCode,
                  name: region.name,
                  externalCode: region.externalCode,
                  filePrefix: fssFilePrefix,
                  templateType: fssFilePrefix === 'Ichki' ? 'ichki' : 'tashqi',
                });
              }
            }}
            onClose={() => setShowFssRegionModal(false)}
            onReload={loadRegionCodes}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddFieldModal && (
          <AddFieldModal
            newFieldLabel={newFieldLabel}
            setNewFieldLabel={setNewFieldLabel}
            onClose={() => setShowAddFieldModal(false)}
            onAdd={(label) => {
              const newField = {
                id: Date.now().toString(),
                label,
                value: '',
              };
              setCustomFields([...customFields, newField]);
              setNewFieldLabel('');
              setShowAddFieldModal(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCargoImportModal && (
          <CargoImportModal
            text={cargoImport.text}
            setText={cargoImport.setText}
            loading={cargoImport.loading}
            rows={cargoImport.rows}
            selectedKeys={cargoImport.selectedKeys}
            toggleKey={cargoImport.toggleKey}
            toggleAll={cargoImport.toggleAll}
            analyze={cargoImport.analyze}
            applyCargo={() => {
              cargoImport.applyCargo();
              setShowCargoImportModal(false);
            }}
            onClose={() => {
              cargoImport.reset();
              setShowCargoImportModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};
