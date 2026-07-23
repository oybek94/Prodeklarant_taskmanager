import React from 'react';
import { Text, View, Image } from '@react-pdf/renderer';
import { styles } from './PdfStyles';
import { resolveUploadUrl } from '../types';

interface PdfSignaturesProps {
  contract: any;
  viewTab: 'invoice' | 'spec' | 'packing' | 'pricelist';
  pdfIncludeSeal: boolean;
  isSellerShipper?: boolean;
  isBuyerConsignee?: boolean;
  scale?: number;
}

interface SpecParty {
  label: string;
  name: string;
  director?: string;
  /** Direktor F.I.Sh. oldiga "Директор" so'zi qo'shiladimi */
  directorPrefix: boolean;
  signatureUrl?: string;
  sealUrl?: string;
}

export const PdfSignatures: React.FC<PdfSignaturesProps> = ({
  contract, viewTab, pdfIncludeSeal, isSellerShipper = true, isBuyerConsignee = true, scale = 1,
}) => {
  const sc = (v: number) => Math.round(v * scale);
  if (viewTab === 'spec') {
    // Kontraktdagi barcha tomonlar — korxona nomi bor bo'lsa direktor
    // ko'rsatilmagan bo'lsa ham ustun sifatida chiqadi. Yuk jo'natuvchi/qabul
    // qiluvchi sotuvchi/sotib oluvchi bilan bir xil bo'lsa takrorlanmaydi.
    const participants = ([
      contract.sellerName ? {
        label: 'Продавец',
        name: contract.sellerName,
        director: contract.supplierDirector,
        directorPrefix: true,
        signatureUrl: contract.sellerSignatureUrl,
        sealUrl: contract.sellerSealUrl,
      } : null,
      contract.buyerName ? {
        label: 'Покупатель',
        name: contract.buyerName,
        director: contract.buyerDirector,
        directorPrefix: false,
        signatureUrl: contract.buyerSignatureUrl,
        sealUrl: contract.buyerSealUrl,
      } : null,
      !isSellerShipper && contract.shipperName ? {
        label: 'Грузоотправитель/Изготовитель',
        name: contract.shipperName,
        directorPrefix: false,
      } : null,
      !isBuyerConsignee && contract.consigneeName ? {
        label: 'Грузополучатель',
        name: contract.consigneeName,
        director: contract.consigneeDirector,
        directorPrefix: false,
        signatureUrl: contract.consigneeSignatureUrl,
        sealUrl: contract.consigneeSealUrl,
      } : null,
    ].filter(Boolean) as SpecParty[]);

    if (!participants.length) return null;

    // Tomonlar ko'p bo'lsa ustunlar torayadi — imzo/pechat ham kichrayadi
    const many = participants.length > 2;
    const sigImgH = sc(many ? 36 : 50);
    const sealImgH = sc(many ? 100 : 140);
    const imgBlockH = sigImgH + sealImgH + sc(6);

    const PartyCol = ({ party }: { party: SpecParty }) => (
      <View style={{ flex: 1, paddingRight: sc(6) }}>
        <Text style={{ fontSize: sc(9), fontWeight: 'bold', marginBottom: sc(3) }}>{party.label}</Text>
        <Text style={{ fontSize: sc(8) }}>{party.name}</Text>
        {party.director && (
          <Text style={{ fontSize: sc(8), color: '#4b5563', marginTop: sc(2) }}>
            {party.directorPrefix ? `Директор ${party.director}` : party.director}
          </Text>
        )}
        <View style={{ alignItems: 'center', minHeight: imgBlockH, marginTop: sc(4) }}>
          {party.signatureUrl && pdfIncludeSeal && (
            <Image
              src={resolveUploadUrl(party.signatureUrl)}
              style={{ height: sigImgH, objectFit: 'contain', marginBottom: sc(4) }}
            />
          )}
          {party.sealUrl && pdfIncludeSeal && (
            <Image
              src={resolveUploadUrl(party.sealUrl)}
              style={{ height: sealImgH, objectFit: 'contain' }}
            />
          )}
        </View>
      </View>
    );

    return (
      <View style={{ marginTop: sc(14) }} wrap={false}>
        <Text style={{ fontSize: sc(9), fontWeight: 'bold', marginBottom: sc(8) }}>Подписи сторон</Text>
        <View style={{ flexDirection: 'row' }}>
          {participants.map((p) => (
            <PartyCol key={`${p.label}-${p.name}`} party={p} />
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
    <View style={{ flexDirection: 'row', marginTop: sc(20), alignItems: 'flex-start' }} wrap={false}>
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
