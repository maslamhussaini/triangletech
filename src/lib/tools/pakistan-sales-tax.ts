export type TaxTreatment =
  | "STANDARD_RATE"
  | "REDUCED_RATE"
  | "ZERO_RATED"
  | "EXEMPT"
  | "THIRD_SCHEDULE"
  | "SPECIAL_RATE"
  | "FURTHER_TAX"
  | "CONDITIONAL"
  | "CUSTOM_RATE"
  | "REQUIRES_VERIFICATION";

export type Confidence = "CONFIRMED" | "STRONG_EVIDENCE" | "REQUIRES_VERIFICATION" | "UNVERIFIED_DO_NOT_IMPLEMENT";
export type RegistrationStatus = "REGISTERED" | "UNREGISTERED" | "LIABLE_BUT_NOT_REGISTERED";
export type BuyerType = "REGISTERED_BUSINESS" | "UNREGISTERED_BUSINESS" | "CONSUMER";
export type BusinessType = "MANUFACTURER" | "IMPORTER" | "DISTRIBUTOR" | "RETAILER" | "OTHER";
export type OriginType = "LOCAL" | "IMPORTED" | "BOTH";
export type PackagingType = "RETAIL_PACKED" | "OTHER";
export type PriceBasis = "TAX_EXCLUSIVE" | "TAX_INCLUSIVE" | "RETAIL_PRICE";

export interface ProductTaxRecord {
  id: string;
  canonicalName: string;
  searchAliases: string[];
  candidatePctCodes: string[];
  pctDescription: string;
  chapter: string;
  originType: OriginType;
  packagingType: PackagingType;
  taxTreatment: TaxTreatment;
  applicableRate?: number;
  fixedTaxAmount?: number;
  valueBand?: { min: number; max: number; rate: number };
  furtherTaxApplicable: boolean;
  furtherTaxRate: number;
  thirdScheduleApplies: boolean;
  priceBasis: PriceBasis;
  scheduleSerial?: string;
  relevantSection: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  legalSource: string;
  sourceUrl: string;
  confidence: Confidence;
  notes?: string;
}

export interface RegisteredUnregisteredRule {
  dimension: "SELLER_STATUS" | "BUYER_STATUS" | "BUSINESS_TYPE";
  condition: string;
  affectsCalculation: boolean;
  affectsInvoice: boolean;
  affectsInputTax: boolean;
  affectsWarnings: boolean;
  rule: string;
  source: string;
  confidence: Confidence;
}

export interface CalculationInput {
  product: ProductTaxRecord;
  amount: number;
  priceBasis: PriceBasis;
  sellerRegistered: RegistrationStatus;
  buyerType: BuyerType;
  businessType: BusinessType;
  origin?: OriginType;
  packagingType?: PackagingType;
  retailPrice?: number;
  furtherTaxApplicable?: boolean;
  customRate?: number;
  eligibleInputTax?: number;
}

export interface CalculationResult {
  taxExclusiveAmount: number;
  salesTax: number;
  furtherTax: number;
  invoiceTotal: number;
  effectiveTaxRate: number;
  inputTax: number;
  outputTax: number;
  estimatedTaxDifference: number;
  warnings: string[];
  disclaimer: string;
  requiresVerification: boolean;
  verificationMessage?: string;
}

const STANDARD_RATE = 0.18;
const FURTHER_TAX_RATE = 0.04;
const THIRD_SCHEDULE_RATE = 18 / 118;

function clampFinite(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value;
}

function validateAmount(amount: number): { valid: boolean; error?: string } {
  if (!Number.isFinite(amount)) return { valid: false, error: "Amount must be a finite number" };
  if (amount < 0) return { valid: false, error: "Amount cannot be negative" };
  return { valid: true };
}

function validateRate(rate: number): { valid: boolean; error?: string } {
  if (!Number.isFinite(rate)) return { valid: false, error: "Rate must be a finite number" };
  if (rate <= 0) return { valid: false, error: "Rate must be greater than 0" };
  if (rate > 1) return { valid: false, error: "Rate seems too high. Enter as decimal (e.g., 0.18 for 18%)" };
  return { valid: true };
}

export function calculateStandardRate(input: CalculationInput): CalculationResult {
  const amountValidation = validateAmount(input.amount);
  if (!amountValidation.valid) {
    return {
      taxExclusiveAmount: 0,
      salesTax: 0,
      furtherTax: 0,
      invoiceTotal: 0,
      effectiveTaxRate: 0,
      inputTax: 0,
      outputTax: 0,
      estimatedTaxDifference: 0,
      warnings: [amountValidation.error || "Invalid amount"],
      disclaimer: "This is an estimate only. Actual tax liability depends on FBR assessment, compliance status and applicable notifications.",
      requiresVerification: false,
    };
  }

  const rate = input.customRate ?? STANDARD_RATE;
  const rateValidation = validateRate(rate);
  if (!rateValidation.valid) {
    return {
      taxExclusiveAmount: 0,
      salesTax: 0,
      furtherTax: 0,
      invoiceTotal: 0,
      effectiveTaxRate: 0,
      inputTax: 0,
      outputTax: 0,
      estimatedTaxDifference: 0,
      warnings: [rateValidation.error || "Invalid rate"],
      disclaimer: "This is an estimate only. Actual tax liability depends on FBR assessment, compliance status and applicable notifications.",
      requiresVerification: false,
    };
  }

  let taxExclusiveAmount: number;
  let salesTax: number;

  if (input.priceBasis === "TAX_INCLUSIVE") {
    taxExclusiveAmount = clampFinite(input.amount / (1 + rate));
    salesTax = clampFinite(input.amount - taxExclusiveAmount);
  } else {
    taxExclusiveAmount = clampFinite(input.amount);
    salesTax = clampFinite(taxExclusiveAmount * rate);
  }

  const outputTax = salesTax;
  const eligibleInputTax = clampFinite(input.eligibleInputTax ?? 0);
  const estimatedTaxDifference = clampFinite(outputTax - eligibleInputTax);

  const warnings: string[] = [];
  if (input.sellerRegistered === "UNREGISTERED" || input.sellerRegistered === "LIABLE_BUT_NOT_REGISTERED") {
    warnings.push("Unregistered sellers cannot charge output sales tax. Further tax may apply.");
  }

  return {
    taxExclusiveAmount,
    salesTax,
    furtherTax: 0,
    invoiceTotal: clampFinite(taxExclusiveAmount + salesTax),
    effectiveTaxRate: taxExclusiveAmount > 0 ? clampFinite((salesTax / taxExclusiveAmount) * 100) : 0,
    inputTax: eligibleInputTax,
    outputTax,
    estimatedTaxDifference,
    warnings,
    disclaimer: "This is an estimate only. Actual tax liability depends on FBR assessment, compliance status and applicable notifications.",
    requiresVerification: false,
  };
}

export function calculateThirdSchedule(input: CalculationInput): CalculationResult {
  const retailPrice = input.retailPrice ?? input.amount;

  if (!retailPrice || retailPrice <= 0) {
    return {
      taxExclusiveAmount: 0,
      salesTax: 0,
      furtherTax: 0,
      invoiceTotal: 0,
      effectiveTaxRate: 0,
      inputTax: 0,
      outputTax: 0,
      estimatedTaxDifference: 0,
      warnings: ["Retail price is required for Third Schedule calculation."],
      disclaimer: "This is an estimate only. Actual tax liability depends on FBR assessment, compliance status and applicable notifications.",
      requiresVerification: true,
      verificationMessage: "Third Schedule calculation requires the printed retail price.",
    };
  }

  const salesTax = clampFinite(retailPrice * THIRD_SCHEDULE_RATE);
  const outputTax = salesTax;
  const eligibleInputTax = clampFinite(input.eligibleInputTax ?? 0);
  const estimatedTaxDifference = clampFinite(outputTax - eligibleInputTax);

  const warnings: string[] = [
    "Third Schedule goods are taxed on retail price basis, not transaction value.",
    "Sales tax must be printed on packaging by manufacturer/importer.",
  ];

  if (input.sellerRegistered === "UNREGISTERED" || input.sellerRegistered === "LIABLE_BUT_NOT_REGISTERED") {
    warnings.push("Unregistered sellers cannot charge output sales tax. Further tax may apply.");
  }

  return {
    taxExclusiveAmount: clampFinite(retailPrice - salesTax),
    salesTax,
    furtherTax: 0,
    invoiceTotal: clampFinite(retailPrice),
    effectiveTaxRate: retailPrice > 0 ? clampFinite((salesTax / retailPrice) * 100) : 0,
    inputTax: eligibleInputTax,
    outputTax,
    estimatedTaxDifference,
    warnings,
    disclaimer: "This is an estimate only. Actual tax liability depends on FBR assessment, compliance status and applicable notifications.",
    requiresVerification: false,
  };
}

export function calculateFurtherTax(input: CalculationInput, baseResult: CalculationResult): CalculationResult {
  if (!input.furtherTaxApplicable) {
    return baseResult;
  }

  if (input.buyerType === "REGISTERED_BUSINESS") {
    return {
      ...baseResult,
      warnings: [...baseResult.warnings, "Further tax generally applies only to supplies to non-registered persons."],
    };
  }

  const furtherTax = clampFinite(baseResult.taxExclusiveAmount * FURTHER_TAX_RATE);
  const invoiceTotal = clampFinite(baseResult.invoiceTotal + furtherTax);

  return {
    ...baseResult,
    furtherTax,
    invoiceTotal,
    effectiveTaxRate: baseResult.taxExclusiveAmount > 0 ? clampFinite(((baseResult.salesTax + furtherTax) / baseResult.taxExclusiveAmount) * 100) : 0,
    warnings: [
      ...baseResult.warnings,
      "4% Further Tax applied under Section 3(1A). Specific notifications/exclusions may affect applicability.",
    ],
  };
}

export function calculate(input: CalculationInput): CalculationResult {
  if (input.product.taxTreatment === "REQUIRES_VERIFICATION") {
    return {
      taxExclusiveAmount: 0,
      salesTax: 0,
      furtherTax: 0,
      invoiceTotal: 0,
      effectiveTaxRate: 0,
      inputTax: 0,
      outputTax: 0,
      estimatedTaxDifference: 0,
      warnings: [],
      disclaimer: "This is an estimate only. Actual tax liability depends on FBR assessment, compliance status and applicable notifications.",
      requiresVerification: true,
      verificationMessage: `Tax treatment for "${input.product.canonicalName}" requires verification. Classification, schedule membership, or applicable rate depends on additional facts not yet automated.`,
    };
  }

  if (input.product.taxTreatment === "THIRD_SCHEDULE") {
    const thirdScheduleResult = calculateThirdSchedule(input);
    if (thirdScheduleResult.requiresVerification) {
      return thirdScheduleResult;
    }
    return calculateFurtherTax(input, thirdScheduleResult);
  }

  if (input.product.taxTreatment === "CUSTOM_RATE" && input.customRate !== undefined) {
    const customInput = { ...input, product: { ...input.product, taxTreatment: "STANDARD_RATE" as const } };
    const standardResult = calculateStandardRate(customInput);
    return calculateFurtherTax(input, standardResult);
  }

  const standardResult = calculateStandardRate(input);
  return calculateFurtherTax(input, standardResult);
}

export const DEFAULT_CALCULATION_INPUT: Omit<CalculationInput, "product"> = {
  amount: 0,
  priceBasis: "TAX_EXCLUSIVE",
  sellerRegistered: "REGISTERED",
  buyerType: "REGISTERED_BUSINESS",
  businessType: "RETAILER",
  furtherTaxApplicable: false,
  eligibleInputTax: 0,
};

export const STANDARD_PRODUCTS: ProductTaxRecord[] = [
  {
    id: "monitor",
    canonicalName: "Monitor",
    searchAliases: ["monitor", "screen", "display", "lcd", "led monitor"],
    candidatePctCodes: ["8528.6200", "8528.7200"],
    pctDescription: "Monitors and display devices",
    chapter: "85",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "STANDARD_RATE",
    applicableRate: 0.18,
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Section 3(1)",
    legalSource: "Sales Tax Act, 1990",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "STRONG_EVIDENCE",
  },
  {
    id: "printer",
    canonicalName: "Printer",
    searchAliases: ["printer", "laser printer", "inkjet printer", "office printer"],
    candidatePctCodes: ["8443.3210", "8443.3290"],
    pctDescription: "Printers and printing equipment",
    chapter: "84",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "STANDARD_RATE",
    applicableRate: 0.18,
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Section 3(1)",
    legalSource: "Sales Tax Act, 1990",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "STRONG_EVIDENCE",
  },
  {
    id: "mobile-charger",
    canonicalName: "Mobile Charger",
    searchAliases: ["mobile charger", "phone charger", "charger", "usb charger", "adapter"],
    candidatePctCodes: ["8504.4030", "8504.4090"],
    pctDescription: "Battery chargers and power supplies",
    chapter: "85",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "STANDARD_RATE",
    applicableRate: 0.18,
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Section 3(1)",
    legalSource: "Sales Tax Act, 1990",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "STRONG_EVIDENCE",
  },
  {
    id: "power-bank",
    canonicalName: "Power Bank",
    searchAliases: ["power bank", "portable charger", "external battery", "power pack"],
    candidatePctCodes: ["8507.6000"],
    pctDescription: "Electric accumulators and batteries",
    chapter: "85",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "STANDARD_RATE",
    applicableRate: 0.18,
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Section 3(1)",
    legalSource: "Sales Tax Act, 1990",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "STRONG_EVIDENCE",
  },
  {
    id: "headphones",
    canonicalName: "Headphones / Earphones",
    searchAliases: ["headphones", "earphones", "earbuds", "headset", "audio"],
    candidatePctCodes: ["8518.3000", "8518.5000"],
    pctDescription: "Headphones and earphones",
    chapter: "85",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "STANDARD_RATE",
    applicableRate: 0.18,
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Section 3(1)",
    legalSource: "Sales Tax Act, 1990",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "STRONG_EVIDENCE",
  },
];

export const THIRD_SCHEDULE_PRODUCTS: ProductTaxRecord[] = [
  {
    id: "bottled-water",
    canonicalName: "Bottled Water",
    searchAliases: ["bottled water", "mineral water", "water bottle", "packaged water"],
    candidatePctCodes: ["2201.1000", "2202.1000"],
    pctDescription: "Waters and other beverages",
    chapter: "22",
    originType: "BOTH",
    packagingType: "RETAIL_PACKED",
    taxTreatment: "THIRD_SCHEDULE",
    applicableRate: 0.18,
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: true,
    priceBasis: "RETAIL_PRICE",
    scheduleSerial: "Third Schedule, Serial 34",
    relevantSection: "Section 3(2)(a)",
    legalSource: "Sales Tax Act, 1990; Finance Act 2025",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "CONFIRMED",
    notes: "Retail price must be printed. Imported retail price shall not be less than 130% of customs value including duties.",
  },
  {
    id: "tea",
    canonicalName: "Tea (Retail-Packed)",
    searchAliases: ["tea", "black tea", "green tea", "tea bag", "loose tea"],
    candidatePctCodes: ["0902.1000", "0902.3000"],
    pctDescription: "Tea and related products",
    chapter: "09",
    originType: "BOTH",
    packagingType: "RETAIL_PACKED",
    taxTreatment: "THIRD_SCHEDULE",
    applicableRate: 0.18,
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: true,
    priceBasis: "RETAIL_PRICE",
    scheduleSerial: "Third Schedule, Serial 38",
    relevantSection: "Section 3(2)(a)",
    legalSource: "Sales Tax Act, 1990",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "CONFIRMED",
    notes: "Retail-packed condition applies. Retail price must be printed.",
  },
  {
    id: "coffee",
    canonicalName: "Coffee (Imported Retail-Packed)",
    searchAliases: ["coffee", "instant coffee", "coffee bean", "ground coffee"],
    candidatePctCodes: ["0901.1100", "0901.1200", "0901.2100", "0901.2200", "0901.9000", "2101.1120"],
    pctDescription: "Coffee and coffee substitutes",
    chapter: "09",
    originType: "IMPORTED",
    packagingType: "RETAIL_PACKED",
    taxTreatment: "THIRD_SCHEDULE",
    applicableRate: 0.18,
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: true,
    priceBasis: "RETAIL_PRICE",
    scheduleSerial: "Third Schedule, Serial 45",
    relevantSection: "Section 3(2)(a)",
    legalSource: "Sales Tax Act, 1990; Finance Act 2025",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "STRONG_EVIDENCE",
    notes: "Imported retail-packed only, added by Finance Act 2025. Retail price must be printed.",
  },
  {
    id: "chocolate",
    canonicalName: "Chocolate (Imported Retail-Packed)",
    searchAliases: ["chocolate", "cocoa", "chocolate bar", "confectionery"],
    candidatePctCodes: ["1704.9010", "1806.2090", "1806.3100", "1806.3200", "1806.9000"],
    pctDescription: "Chocolate and chocolate confectionery",
    chapter: "18",
    originType: "IMPORTED",
    packagingType: "RETAIL_PACKED",
    taxTreatment: "THIRD_SCHEDULE",
    applicableRate: 0.18,
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: true,
    priceBasis: "RETAIL_PRICE",
    scheduleSerial: "Third Schedule, Serial 46",
    relevantSection: "Section 3(2)(a)",
    legalSource: "Sales Tax Act, 1990; Finance Act 2025",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "STRONG_EVIDENCE",
    notes: "Imported retail-packed only, added by Finance Act 2025. Retail price must be printed.",
  },
  {
    id: "detergent",
    canonicalName: "Detergent",
    searchAliases: ["detergent", "washing powder", "laundry detergent", "soap powder"],
    candidatePctCodes: ["3401.1100", "3401.2000", "3401.5000"],
    pctDescription: "Detergents and cleaning products",
    chapter: "34",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "THIRD_SCHEDULE",
    applicableRate: 0.18,
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: true,
    priceBasis: "RETAIL_PRICE",
    scheduleSerial: "Third Schedule, Serial 5",
    relevantSection: "Section 3(2)(a)",
    legalSource: "Sales Tax Act, 1990",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "CONFIRMED",
    notes: "Retail price must be printed.",
  },
];

export const DEFERRED_PRODUCTS: ProductTaxRecord[] = [
  {
    id: "laptop",
    canonicalName: "Laptop",
    searchAliases: ["laptop", "notebook", "portable computer"],
    candidatePctCodes: ["8471.3000", "8471.8000"],
    pctDescription: "Portable automatic data processing machines",
    chapter: "84",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "REQUIRES_VERIFICATION",
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Requires verification",
    legalSource: "Requires verification",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "REQUIRES_VERIFICATION",
    notes: "Local manufacture may have special treatment. Requires origin and classification verification.",
  },
  {
    id: "desktop",
    canonicalName: "Desktop / PC",
    searchAliases: ["desktop", "pc", "personal computer", "tower computer"],
    candidatePctCodes: ["8471.4900", "8471.7000"],
    pctDescription: "Desktop automatic data processing machines",
    chapter: "84",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "REQUIRES_VERIFICATION",
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Requires verification",
    legalSource: "Requires verification",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "REQUIRES_VERIFICATION",
    notes: "Local manufacture may have special treatment. Requires origin and classification verification.",
  },
  {
    id: "tablet",
    canonicalName: "Tablet",
    searchAliases: ["tablet", "ipad", "android tablet", "tab"],
    candidatePctCodes: ["8471.3000", "8517.1200", "9031.0000"],
    pctDescription: "Tablet computers / ambiguous classification",
    chapter: "84/85/90",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "REQUIRES_VERIFICATION",
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Requires verification",
    legalSource: "Requires verification",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "REQUIRES_VERIFICATION",
    notes: "Ambiguous classification between computer/telecom/other. Requires official Pakistan Customs ruling.",
  },
  {
    id: "mobile-phone",
    canonicalName: "Mobile Phone",
    searchAliases: ["mobile phone", "smartphone", "cell phone", "handset"],
    candidatePctCodes: ["8517.1219", "8517.1300"],
    pctDescription: "Mobile telephones",
    chapter: "85",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "REQUIRES_VERIFICATION",
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Ninth Schedule; SRO 527(I)/2026",
    legalSource: "Requires verification",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "REQUIRES_VERIFICATION",
    notes: "Ninth Schedule special rates. SRO 527(I)/2026 may apply. Not simply 18%.",
  },
  {
    id: "smart-watch",
    canonicalName: "Smart Watch",
    searchAliases: ["smart watch", "smartwatch", "wearable"],
    candidatePctCodes: ["8517.6290", "9102.1200"],
    pctDescription: "Smart watches / ambiguous classification",
    chapter: "85/91",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "REQUIRES_VERIFICATION",
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Requires verification",
    legalSource: "Requires verification",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "REQUIRES_VERIFICATION",
    notes: "Ambiguous between telecom and watch classifications. Requires official ruling.",
  },
  {
    id: "rice",
    canonicalName: "Rice",
    searchAliases: ["rice", "basmati", "non-basmati", "paddy"],
    candidatePctCodes: ["1006.3000", "1006.2000"],
    pctDescription: "Rice",
    chapter: "10",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "REQUIRES_VERIFICATION",
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Requires verification",
    legalSource: "Requires verification",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "REQUIRES_VERIFICATION",
    notes: "May be exempt or reduced under Sixth/Eighth Schedule. Requires schedule lookup.",
  },
  {
    id: "wheat-flour",
    canonicalName: "Wheat Flour / Atta",
    searchAliases: ["wheat flour", "atta", "flour"],
    candidatePctCodes: ["1101.0000"],
    pctDescription: "Wheat flour",
    chapter: "11",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "REQUIRES_VERIFICATION",
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Requires verification",
    legalSource: "Requires verification",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "REQUIRES_VERIFICATION",
    notes: "May be exempt or reduced under Sixth/Eighth Schedule. Requires schedule lookup.",
  },
  {
    id: "milk",
    canonicalName: "Milk",
    searchAliases: ["milk", "fresh milk", "pasteurized milk"],
    candidatePctCodes: ["0401.1000", "0401.2000"],
    pctDescription: "Milk and cream",
    chapter: "04",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "REQUIRES_VERIFICATION",
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Requires verification",
    legalSource: "Requires verification",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "REQUIRES_VERIFICATION",
    notes: "Essential food item. May be exempt or reduced. Requires schedule lookup.",
  },
  {
    id: "eggs",
    canonicalName: "Eggs",
    searchAliases: ["eggs", "hen eggs", "table eggs"],
    candidatePctCodes: ["0407.0000"],
    pctDescription: "Eggs",
    chapter: "04",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "REQUIRES_VERIFICATION",
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Requires verification",
    legalSource: "Requires verification",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "REQUIRES_VERIFICATION",
    notes: "Essential food item. May be exempt or reduced. Requires schedule lookup.",
  },
  {
    id: "cooking-oil",
    canonicalName: "Cooking Oil / Ghee",
    searchAliases: ["cooking oil", "ghee", "vegetable oil", "edible oil"],
    candidatePctCodes: ["1511.1000", "1512.1900"],
    pctDescription: "Cooking oils and ghee",
    chapter: "15",
    originType: "BOTH",
    packagingType: "OTHER",
    taxTreatment: "REQUIRES_VERIFICATION",
    furtherTaxApplicable: true,
    furtherTaxRate: FURTHER_TAX_RATE,
    thirdScheduleApplies: false,
    priceBasis: "TAX_EXCLUSIVE",
    relevantSection: "Requires verification",
    legalSource: "Requires verification",
    sourceUrl: "https://download1.fbr.gov.pk/Docs/20267171373418951SalesTaxAct1990updatedupto30.06.2026.pdf",
    confidence: "REQUIRES_VERIFICATION",
    notes: "May have reduced rate under Eighth Schedule. Requires schedule lookup.",
  },
];

export const ALL_PRODUCTS: ProductTaxRecord[] = [...STANDARD_PRODUCTS, ...THIRD_SCHEDULE_PRODUCTS, ...DEFERRED_PRODUCTS];

export function findProductBySearch(query: string): ProductTaxRecord[] {
  const lower = query.toLowerCase().trim();
  if (!lower) return [];
  return ALL_PRODUCTS.filter(
    (product) =>
      product.canonicalName.toLowerCase().includes(lower) ||
      product.searchAliases.some((alias) => alias.toLowerCase().includes(lower)) ||
      product.candidatePctCodes.some((code) => code.toLowerCase().includes(lower))
  );
}

export function getProductById(id: string): ProductTaxRecord | undefined {
  return ALL_PRODUCTS.find((product) => product.id === id);
}
