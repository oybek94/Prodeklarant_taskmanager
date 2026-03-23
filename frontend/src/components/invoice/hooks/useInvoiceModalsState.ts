import { useState, useCallback } from 'react';
import type { RegionCode, FssFilePrefix } from '../types';

export const useInvoiceModalsState = () => {
  const [showAdditionalInfoModal, setShowAdditionalInfoModal] = useState(false);
  const [additionalInfoError, setAdditionalInfoError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [specCustomFields, setSpecCustomFields] = useState<Array<{ id: string; label: string; value: string }>>([]);
  
  const [additionalInfoVisible, setAdditionalInfoVisible] = useState<Record<string, boolean>>({});
  const toggleAdditionalInfoVisible = useCallback((key: string) => {
    setAdditionalInfoVisible((prev) => ({ ...prev, [key]: prev[key] === false }));
  }, []);
  const isAdditionalInfoVisible = useCallback((key: string) => additionalInfoVisible[key] !== false, [additionalInfoVisible]);

  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');

  const [regionCodes, setRegionCodes] = useState<RegionCode[]>([]);
  const [regionCodesLoading, setRegionCodesLoading] = useState(false);
  const [regionSearch, setRegionSearch] = useState('');
  const [showFssRegionModal, setShowFssRegionModal] = useState(false);
  const [fssFilePrefix, setFssFilePrefix] = useState<FssFilePrefix>('Ichki');
  const [fssAutoDownload, setFssAutoDownload] = useState(true);

  const [addressCopySuccess, setAddressCopySuccess] = useState(false);

  return {
    showAdditionalInfoModal,
    setShowAdditionalInfoModal,
    additionalInfoError,
    setAdditionalInfoError,
    customFields,
    setCustomFields,
    specCustomFields,
    setSpecCustomFields,
    additionalInfoVisible,
    setAdditionalInfoVisible,
    toggleAdditionalInfoVisible,
    isAdditionalInfoVisible,
    showAddFieldModal,
    setShowAddFieldModal,
    newFieldLabel,
    setNewFieldLabel,
    regionCodes,
    setRegionCodes,
    regionCodesLoading,
    setRegionCodesLoading,
    regionSearch,
    setRegionSearch,
    showFssRegionModal,
    setShowFssRegionModal,
    fssFilePrefix,
    setFssFilePrefix,
    fssAutoDownload,
    setFssAutoDownload,
    addressCopySuccess,
    setAddressCopySuccess,
  };
};
