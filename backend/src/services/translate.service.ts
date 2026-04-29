import OpenAIClient from '../ai/openai.client';

interface TranslatedRequisites {
  sellerName?: string;
  sellerAddress?: string;
  sellerDetails?: string;
  buyerName?: string;
  buyerAddress?: string;
  buyerDetails?: string;
  consigneeName?: string;
  consigneeAddress?: string;
  consigneeDetails?: string;
  deliveryTerms?: string;
  notes?: string;
  [key: string]: string | undefined;
}

/**
 * Translate invoice requisites from Russian to English using OpenAI.
 * Sends all texts in a single API call for efficiency.
 */
export async function translateRequisites(
  texts: Record<string, string>
): Promise<TranslatedRequisites> {
  // Pre-process texts for specific hardcoded translations
  const preProcessedTexts: Record<string, string> = {};
  for (const [k, v] of Object.entries(texts)) {
    if (v) {
      // Hardcoded translation for АРВИАЙ
      preProcessedTexts[k] = v.replace(/АО ["«]АРВИАЙ \(РАШЕН ВЕНЧУР ИНВЕСТМЕНТС\)["»]/gi, 'JSC "RVI (RUSSIAN VENTURE INVESTMENTS)"');
    }
  }

  // Filter out empty values
  const entries = Object.entries(preProcessedTexts).filter(([, v]) => v && v.trim());
  if (entries.length === 0) return {};

  try {
    const client = OpenAIClient.getClient();

    const fieldsJson = JSON.stringify(Object.fromEntries(entries), null, 2);

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a professional translator for international trade documents. Translate the given JSON fields from Russian to English. Keep INN numbers, bank account numbers, SWIFT codes, phone numbers, email addresses, and other identifiers unchanged. For company names, transliterate them if they don't have a common English equivalent (e.g. "ООО" → "LLC", "ЗАО" → "CJSC"). For addresses, transliterate city/region names. Return a JSON object with the same keys but English values.`,
        },
        {
          role: 'user',
          content: fieldsJson,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return Object.fromEntries(entries);

    const parsed = JSON.parse(content) as TranslatedRequisites;
    return parsed;
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback: return original texts
    return Object.fromEntries(entries);
  }
}

/**
 * Build a flat map of all translatable requisite texts from contract/client data.
 */
export function buildTranslatableTexts(data: {
  contract?: any;
  client?: any;
  company?: any;
  additionalInfo?: any;
  invoice?: any;
}): Record<string, string> {
  const texts: Record<string, string> = {};
  const { contract, client, company, additionalInfo, invoice } = data;

  if (contract) {
    if (contract.sellerName) texts.sellerName = contract.sellerName;
    if (contract.sellerLegalAddress) texts.sellerAddress = contract.sellerLegalAddress;
    if (contract.sellerDetails) texts.sellerDetails = contract.sellerDetails;
    if (contract.buyerName) texts.buyerName = contract.buyerName;
    if (contract.buyerAddress) texts.buyerAddress = contract.buyerAddress;
    if (contract.buyerDetails) texts.buyerDetails = contract.buyerDetails;
    if (contract.consigneeName) texts.consigneeName = contract.consigneeName;
    if (contract.consigneeAddress) texts.consigneeAddress = contract.consigneeAddress;
    if (contract.consigneeDetails) texts.consigneeDetails = contract.consigneeDetails;

    // Bank info (only if not in details)
    if (!contract.sellerDetails) {
      if (contract.sellerBankName) texts.sellerBankName = contract.sellerBankName;
      if (contract.sellerBankAddress) texts.sellerBankAddress = contract.sellerBankAddress;
      if (contract.sellerCorrespondentBank) texts.sellerCorrespondentBank = contract.sellerCorrespondentBank;
    }
    if (!contract.buyerDetails) {
      if (contract.buyerBankName) texts.buyerBankName = contract.buyerBankName;
      if (contract.buyerBankAddress) texts.buyerBankAddress = contract.buyerBankAddress;
      if (contract.buyerCorrespondentBank) texts.buyerCorrespondentBank = contract.buyerCorrespondentBank;
    }
    if (!contract.consigneeDetails) {
      if (contract.consigneeBankName) texts.consigneeBankName = contract.consigneeBankName;
      if (contract.consigneeBankAddress) texts.consigneeBankAddress = contract.consigneeBankAddress;
    }
  } else {
    if (company) {
      if (company.name) texts.sellerName = `ООО "${company.name}"`;
      if (company.legalAddress) texts.sellerAddress = company.legalAddress;
      if (company.actualAddress) texts.sellerActualAddress = company.actualAddress;
      if (company.bankName) texts.sellerBankName = company.bankName;
      if (company.bankAddress) texts.sellerBankAddress = company.bankAddress;
      if (company.correspondentBank) texts.sellerCorrespondentBank = company.correspondentBank;
      if (company.correspondentBankAddress) texts.sellerCorrespondentBankAddress = company.correspondentBankAddress;
    }
    if (client) {
      if (client.name) texts.buyerName = client.name;
      if (client.address) texts.buyerAddress = client.address;
      if (client.bankName) texts.buyerBankName = client.bankName;
      if (client.bankAddress) texts.buyerBankAddress = client.bankAddress;
      if (client.correspondentBank) texts.buyerCorrespondentBank = client.correspondentBank;
    }
  }

  // Additional info
  if (additionalInfo) {
    if (additionalInfo.deliveryTerms) texts.deliveryTerms = additionalInfo.deliveryTerms;
    if (additionalInfo.shipmentPlace) texts.shipmentPlace = additionalInfo.shipmentPlace;
    if (additionalInfo.destination) texts.destination = additionalInfo.destination;
    if (additionalInfo.origin) texts.origin = additionalInfo.origin;
    if (additionalInfo.manufacturer) texts.manufacturer = additionalInfo.manufacturer;
    if (additionalInfo.harvestYear) texts.harvestYear = additionalInfo.harvestYear;
  }

  if (invoice) {
    if (invoice.notes) texts.notes = invoice.notes;
    if (invoice.items) {
      invoice.items.forEach((item: any, index: number) => {
        const keySuffix = item.id || index;
        if (item.packageType) {
          texts[`pkg_${item.packageType}`] = item.packageType;
        }
        if (item.name) {
          texts[`item_name_${keySuffix}`] = item.name;
        }
        if (item.unit) {
          texts[`item_unit_${keySuffix}`] = item.unit;
        }
      });
    }
  }

  if (contract) {
    if (contract.supplierDirector) texts.supplierDirector = contract.supplierDirector;
    if (contract.goodsReleasedBy) texts.goodsReleasedBy = contract.goodsReleasedBy;
  }

  return texts;
}
