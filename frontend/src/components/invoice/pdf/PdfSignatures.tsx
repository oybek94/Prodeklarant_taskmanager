import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { resolveUploadUrl } from '../types';

interface PdfSignaturesProps {
  contract: any;
  viewTab: 'invoice' | 'spec' | 'packing' | 'pricelist';
  pdfIncludeSeal: boolean;
  scale?: number;
}

export const PdfSignatures: React.FC<PdfSignaturesProps> = ({ contract, viewTab, pdfIncludeSeal, scale = 1 }) => {
  const sc = (v: number) => Math.round(v * scale);
  if (viewTab === 'spec') {
    const participants = [
      contract.sellerName ? { label: 'Продавец', name: contract.sellerName, director: contract.supplierDirector, signatureUrl: contract.sellerSignatureUrl, sealUrl: contract.sellerSealUrl } : null,
      contract.buyerName ? { label: 'Покупатель', name: contract.buyerName, director: contract.buyerDirector, signatureUrl: contract.buyerSignatureUrl, sealUrl: contract.buyerSealUrl } : null,
      contract.shipperName ? { label: 'Грузоотправитель', name: contract.shipperName, director: undefined, signatureUrl: undefined, sealUrl: undefined } : null,
      contract.consigneeName ? { label: 'Грузополучатель', name: contract.consigneeName, director: contract.consigneeDirector, signatureUrl: contract.consigneeSignatureUrl, sealUrl: contract.consigneeSealUrl } : null,
    ].filter(Boolean) as Array<{ label: string; name: string; director?: string; signatureUrl?: string; sealUrl?: string }>;

    if (!participants.length) return null;

    return (
      <View style={{ marginTop: sc(20) }}>
        <Text style={{ fontSize: sc(11), fontWeight: 'bold', marginBottom: sc(10) }}>Подписи сторон</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {participants.map((p, idx) => (
            <View key={idx} style={{ flex: 1, padding: sc(5) }}>
              <Text style={{ fontSize: sc(10), fontWeight: 'bold', marginBottom: sc(5) }}>{p.label}</Text>
              <Text style={{ fontSize: sc(9) }}>{p.name}</Text>
              {p.director && (
                <Text style={{ fontSize: sc(9), color: '#4b5563', marginTop: sc(2) }}>
                  {p.label === 'Покупатель' || p.label === 'Грузополучатель' ? p.director : `Директор ${p.director}`}
                </Text>
              )}
              {p.signatureUrl && pdfIncludeSeal && (
                <Image src={resolveUploadUrl(p.signatureUrl)} style={{ height: sc(40), objectFit: 'contain', marginTop: sc(5) }} />
              )}
              {p.sealUrl && pdfIncludeSeal && (
                <Image src={resolveUploadUrl(p.sealUrl)} style={{ height: sc(100), objectFit: 'contain', marginTop: sc(5) }} />
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!contract.supplierDirector) return null;

  const signatureUrl = contract.sellerSignatureUrl || contract.signatureUrl;
  const sealUrl = contract.sellerSealUrl || contract.sealUrl;
  const hasImages = pdfIncludeSeal && (signatureUrl || sealUrl);

  return (
    <View style={{ marginTop: sc(20) }}>
      {/* Руководитель Поставщика + imzo/pechat yonida */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flexDirection: 'column', justifyContent: 'center' }}>
          <Text style={{ fontSize: sc(9), fontWeight: 'bold' }}>Руководитель Поставщика:</Text>
          <Text style={{ fontSize: sc(9) }}>{contract.supplierDirector}</Text>
        </View>

        {hasImages && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: sc(12) }}>
            {signatureUrl && (
              <Image
                src={resolveUploadUrl(signatureUrl)}
                style={{ height: sc(50), objectFit: 'contain', marginRight: sc(6) }}
              />
            )}
            {sealUrl && (
              <Image
                src={resolveUploadUrl(sealUrl)}
                style={{ height: sc(100), objectFit: 'contain' }}
              />
            )}
          </View>
        )}
      </View>

      {contract.goodsReleasedBy && (
        <View style={{ marginTop: sc(8) }}>
          <Text style={{ fontSize: sc(9), fontWeight: 'bold' }}>Товар отпустил:</Text>
          <Text style={{ fontSize: sc(9) }}>{contract.goodsReleasedBy}</Text>
        </View>
      )}
    </View>
  );
};
