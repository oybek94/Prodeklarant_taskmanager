import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import { Contract, CompanySettings, Prisma } from '@prisma/client';
import { resolveExporterRequisites, generateExporterLetterhead, buildGmoProductLines } from '../services/exporter-letterhead';

const contract = (over: Partial<Contract> = {}) =>
  ({
    sellerName: 'ООО «Agro Export»',
    sellerLegalAddress: 'г. Фергана,  ул. Мустакиллик, 1',
    sellerInn: '301234567',
    sellerBankName: 'АКБ «Асака»',
    sellerBankAccount: '20208000123456789001',
    sellerBankSwift: 'ASBKUZ22',
    sellerDetails: null,
    supplierDirector: 'Каримов А.',
    shipperName: null,
    companyLogoUrl: null,
    ...over,
  }) as Contract;

const settings = {
  name: 'PRODEKLARANT',
  legalAddress: 'Toshkent',
  inn: '999',
  mfo: '00445',
  director: 'Direktor X',
} as CompanySettings;

describe('resolveExporterRequisites', () => {
  it('sotuvchi eksportyor: rekvizitlar va direktor shartnomadan', () => {
    const r = resolveExporterRequisites({ contract: contract(), companySettings: settings });
    expect(r).toMatchObject({
      name: 'ООО «Agro Export»',
      address: 'г. Фергана, ул. Мустакиллик, 1',
      inn: '301234567',
      bankAccount: '20208000123456789001',
      swift: 'ASBKUZ22',
      director: 'Каримов А.',
    });
  });

  it('jo\'natuvchi sotuvchidan boshqa bo\'lsa — eksportyor jo\'natuvchi, direktor bo\'sh', () => {
    const r = resolveExporterRequisites({
      contract: contract({ shipperName: 'ФХ «Bog\'bon»', shipperAddress: 'Фергана', shipperInn: '555' }),
    });
    expect(r).toMatchObject({ name: 'ФХ «Bog\'bon»', address: 'Фергана', inn: '555', director: '' });
  });

  it('jo\'natuvchi sotuvchi bilan bir xil bo\'lsa — sotuvchi', () => {
    const r = resolveExporterRequisites({ contract: contract({ shipperName: ' ООО «Agro Export» ' }) });
    expect(r.director).toBe('Каримов А.');
  });

  it('shartnoma bo\'lmasa — kompaniya sozlamalari', () => {
    const r = resolveExporterRequisites({ contract: null, companySettings: settings });
    expect(r).toMatchObject({ name: 'PRODEKLARANT', inn: '999', mfo: '00445', director: 'Direktor X' });
  });
});

describe('generateExporterLetterhead', () => {
  it('eksportyor nomi, rekvizitlari va direktori Word faylga yoziladi', async () => {
    const buffer = await generateExporterLetterhead({ contract: contract() });
    const zip = new PizZip(buffer);
    const text = (name: string) => zip.file(name)?.asText() ?? '';
    const header = zip.file(/word\/header\d*\.xml/).map((f) => f.asText()).join('');
    const footer = zip.file(/word\/footer\d*\.xml/).map((f) => f.asText()).join('');

    expect(header).toContain('ООО «Agro Export»');
    expect(header).toContain('301234567');
    expect(footer).toContain('20208000123456789001');
    expect(text('word/document.xml')).toContain('Каримов А.');
  });
});

describe('GMO spravkasi', () => {
  const D = (v: string) => new Prisma.Decimal(v);

  it('bir xil nomli qatorlar birlashadi, netto yig\'iladi, hosil yili qo\'shiladi', () => {
    const lines = buildGmoProductLines(
      [
        { name: 'Виноград свежий, калибр 18мм+', netWeight: D('10000') },
        { name: 'Виноград свежий, калибр 18мм+', netWeight: D('10987') },
        { name: 'Гранат, урожай 2025 года', netWeight: D('500.5') },
        { name: '  ', netWeight: D('1') },
      ],
      '2026',
    );
    expect(lines).toEqual([
      { name: 'Виноград свежий, калибр 18мм+, урожай 2026 года', net: '20987' },
      { name: 'Гранат, урожай 2025 года', net: '500,5' },
    ]);
  });

  it('invoys va transport ma\'lumotlari spravkaga yoziladi', async () => {
    const buffer = await generateExporterLetterhead({
      contract: contract(),
      kind: 'gmo',
      invoice: {
        invoiceNumber: 'VPF-5',
        date: new Date(2026, 9, 22),
        additionalInfo: { smrNumber: '000411', tirNumber: 'PX87947155', vehicleNumber: '40J659DB', trailerNumber: '404520BA' },
      },
      items: [{ name: 'Виноград свежий', netWeight: D('20987') }],
    });
    const body = new PizZip(buffer).file('word/document.xml')?.asText() ?? '';

    expect(body).toContain('СПРАВКА');
    expect(body).toContain('ООО «Agro Export» заверяет вас');
    expect(body).toContain('1. Виноград свежий - Нетто: 20987 кг');
    expect(body).toContain('Инвойс № VPF-5 от 22.10.2026 г.');
    expect(body).toContain('CMR: 000411');
    expect(body).toContain('Тир: PX87947155');
    expect(body).toContain('АВТО: 40J659DB/404520BA');
    expect(body).toContain('Каримов А.');
  });
});
