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
    const seller = contract.sellerName ? {
      label: 'Продавец',
      name: contract.sellerName,
      director: contract.supplierDirector,
      signatureUrl: contract.sellerSignatureUrl,
      sealUrl: contract.sellerSealUrl,
    } : null;

    const buyer = contract.buyerName ? {
      label: 'Покупатель',
      name: contract.buyerName,
      director: contract.buyerDirector,
      signatureUrl: contract.buyerSignatureUrl,
      sealUrl: contract.buyerSealUrl,
    } : null;

    if (!seller && !buyer) return null;

    // Imzo + pechat balandligi (scale hisobga olingan)
    const imgH = sc(50) + sc(140) + sc(6); // imzo + pechat + oraliq

    const InfoCol = ({ party }: { party: NonNullable<typeof seller> }) => (
      <View style={{ flex: 1, paddingRight: sc(6) }}>
        <Text style={{ fontSize: sc(9), fontWeight: 'bold', marginBottom: sc(3) }}>{party.label}</Text>
        <Text style={{ fontSize: sc(8) }}>{party.name}</Text>
        {party.director && (
          <Text style={{ fontSize: sc(8), color: '#4b5563', marginTop: sc(2) }}>
            {party.label === 'Покупатель' ? party.director : `Директор ${party.director}`}
          </Text>
        )}
      </View>
    );

    const ImgCol = ({ party }: { party: NonNullable<typeof seller> }) => (
      <View style={{ flex: 1, alignItems: 'center', minHeight: imgH }}>
        {party.signatureUrl && pdfIncludeSeal && (
          <Image
            src={resolveUploadUrl(party.signatureUrl)}
            style={{ height: sc(50), objectFit: 'contain', marginBottom: sc(4) }}
          />
        )}
        {party.sealUrl && pdfIncludeSeal && (
          <Image
            src={resolveUploadUrl(party.sealUrl)}
            style={{ height: sc(140), objectFit: 'contain' }}
          />
        )}
      </View>
    );

    return (
      <View style={{ marginTop: sc(14) }}>
        <Text style={{ fontSize: sc(9), fontWeight: 'bold', marginBottom: sc(8) }}>Подписи сторон</Text>
        <View style={{ flexDirection: 'row' }}>
          {/* Col 1: Продавец ma'lumotlari */}
          {seller && <InfoCol party={seller} />}
          {/* Col 2: Продавец imzo + pechat */}
          {seller && <ImgCol party={seller} />}
          {/* Col 3: Покупатель ma'lumotlari */}
          {buyer && <InfoCol party={buyer} />}
          {/* Col 4: Покупатель imzo + pechat */}
          {buyer && <ImgCol party={buyer} />}
        </View>
      </View>
    );
  }

  if (!contract.supplierDirector) return null;

  const signatureUrl = contract.sellerSignatureUrl || contract.signatureUrl;
  const sealUrl = contract.sellerSealUrl || contract.sealUrl;
  const hasImages = pdfIncludeSeal && (signatureUrl || sealUrl);

  return (
    <View style={{ flexDirection: 'row', marginTop: sc(20), alignItems: 'flex-start' }}>
      {/* Chap ustun: barcha matnlar */}
      <View style={{ flexDirection: 'column', justifyContent: 'flex-start' }}>
        <View style={{ marginBottom: sc(8) }}>
          <Text style={{ fontSize: sc(9), fontWeight: 'bold' }}>Руководитель Поставщика:</Text>
          <Text style={{ fontSize: sc(9) }}>{contract.supplierDirector}</Text>
        </View>
        {contract.goodsReleasedBy && (
          <View>
            <Text style={{ fontSize: sc(9), fontWeight: 'bold' }}>Товар отпустил:</Text>
            <Text style={{ fontSize: sc(9) }}>{contract.goodsReleasedBy}</Text>
          </View>
        )}
      </View>

      {/* O'ng ustun: imzo va pechat */}
      {hasImages && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: sc(16) }}>
          {signatureUrl && (
            <Image
              src={resolveUploadUrl(signatureUrl)}
              style={{ height: sc(60), objectFit: 'contain', marginRight: sc(10) }}
            />
          )}
          {sealUrl && (
            <Image
              src={resolveUploadUrl(sealUrl)}
              style={{ height: sc(120), objectFit: 'contain' }}
            />
          )}
        </View>
      )}
    </View>
  );
};
