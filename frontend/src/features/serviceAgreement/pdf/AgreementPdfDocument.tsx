import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from './agreementPdfStyles';
import type { PdfOnRender } from '../../../components/invoice/pdf/pdfLayout';
import type { AgreementTokens } from '../tokens';
import type { AgreementTemplate } from '../templates/types';
import { resolveText, visibleBlocks } from '../templates/types';

export interface AgreementPdfDocumentProps {
  template: AgreementTemplate;
  tokens: AgreementTokens;
  /** @react-pdf `Document.onRender` — glif tekshiruvi uchun (qarang: `pdfGlyphCheck.ts`) */
  onRender?: PdfOnRender;
}

/** `**qalin**` bo'laklarini ajratadi. Boshqa markdown belgilari qo'llanilmaydi. */
function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Text key={i} style={styles.bold}>{part.slice(2, -2)}</Text>
    ) : (
      <Text key={i}>{part}</Text>
    ),
  );
}

export const AgreementPdfDocument: React.FC<AgreementPdfDocumentProps> = ({ template, tokens, onRender }) => (
  <Document onRender={onRender}>
    <Page size="A4" style={styles.page}>
      {visibleBlocks(template, tokens).map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return (
              <Text key={index} style={block.level === 1 ? styles.h1 : styles.h2}>
                {resolveText(block.text, tokens)}
              </Text>
            );
          case 'paragraph':
            return (
              <Text key={index} style={styles.paragraph}>
                {renderInline(resolveText(block.text, tokens))}
              </Text>
            );
          case 'table':
            return (
              <View key={index} style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  {block.header.map((cell, c) => (
                    <Text key={c} style={[styles.tableCellHeader, { width: `${block.widths[c]}%` }]}>{cell}</Text>
                  ))}
                </View>
                {block.rows(tokens).map((row, r) => (
                  <View key={r} style={styles.tableRow}>
                    {row.map((cell, c) => (
                      <Text key={c} style={[styles.tableCell, { width: `${block.widths[c]}%` }]}>{cell}</Text>
                    ))}
                  </View>
                ))}
              </View>
            );
          case 'signature':
            return (
              <View key={index} style={styles.signatureRow}>
                <View style={styles.signatureCol}>
                  <Text style={styles.signatureLine}>Бажарувчи: {tokens.executorDirector}</Text>
                </View>
                <View style={styles.signatureCol}>
                  <Text style={styles.signatureLine}>Буюртмачи: {tokens.customerDirector}</Text>
                </View>
              </View>
            );
          case 'pageBreak':
            return <View key={index} break />;
          default:
            return null;
        }
      })}
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </Page>
  </Document>
);
