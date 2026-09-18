import type { DocumentTypeRuleSet } from "./types";

export const DOCUMENT_TYPE_RULES: DocumentTypeRuleSet[] = [
  // =========================
  // HR / EMPLOYMENT
  // =========================

  {
    domain: "HR / Employment",
    documentType: "CV / Resume",
    rules: [
      { keyword: "curriculum vitae", weight: 5 },
      { keyword: "resume", weight: 5 },
      { keyword: "education", weight: 2 },
      { keyword: "experience", weight: 2 },
      { keyword: "work experience", weight: 3 },
      { keyword: "skills", weight: 2 },
      { keyword: "bachelor", weight: 1 },
      { keyword: "master", weight: 1 },
      { keyword: "professional experience", weight: 3 },
    ],
  },

  {
    domain: "HR / Employment",
    documentType: "Employment Contract",
    rules: [
      { keyword: "employment contract", weight: 5 },
      { keyword: "employee", weight: 3 },
      { keyword: "employer", weight: 3 },
      { keyword: "position", weight: 2 },
      { keyword: "salary", weight: 2 },
      { keyword: "working hours", weight: 2 },
      { keyword: "termination", weight: 2 },
      { keyword: "start date", weight: 2 },
      { keyword: "employment relationship", weight: 3 },
    ],
  },

  {
    domain: "HR / Employment",
    documentType: "Performance Review",
    rules: [
      { keyword: "performance review", weight: 5 },
      { keyword: "performance evaluation", weight: 5 },
      { keyword: "performance appraisal", weight: 4 },
      { keyword: "employee performance", weight: 3 },
      { keyword: "objectives", weight: 2 },
      { keyword: "goals", weight: 2 },
      { keyword: "rating", weight: 2 },
      { keyword: "feedback", weight: 2 },
    ],
  },

  {
    domain: "HR / Employment",
    documentType: "Payroll Record",
    rules: [
      { keyword: "payroll", weight: 5 },
      { keyword: "pay slip", weight: 5 },
      { keyword: "payslip", weight: 5 },
      { keyword: "gross salary", weight: 3 },
      { keyword: "net salary", weight: 3 },
      { keyword: "deductions", weight: 2 },
      { keyword: "tax deduction", weight: 2 },
      { keyword: "employee number", weight: 2 },
    ],
  },

  {
    domain: "HR / Employment",
    documentType: "Leave Application",
    rules: [
      { keyword: "leave application", weight: 5 },
      { keyword: "leave request", weight: 5 },
      { keyword: "annual leave", weight: 3 },
      { keyword: "sick leave", weight: 3 },
      { keyword: "leave period", weight: 3 },
      { keyword: "days of leave", weight: 2 },
      { keyword: "leave approval", weight: 2 },
    ],
  },

  // =========================
  // FINANCE / BANKING
  // =========================

  {
    domain: "Finance / Banking",
    documentType: "Bank Statement",
    rules: [
      { keyword: "bank statement", weight: 5 },
      { keyword: "account statement", weight: 5 },
      { keyword: "iban", weight: 4 },
      { keyword: "account number", weight: 4 },
      { keyword: "transaction", weight: 3 },
      { keyword: "balance", weight: 2 },
      { keyword: "opening balance", weight: 3 },
      { keyword: "closing balance", weight: 3 },
      { keyword: "transaction date", weight: 3 },
    ],
  },

  {
    domain: "Finance / Banking",
    documentType: "Account Opening Form",
    rules: [
      { keyword: "account opening", weight: 5 },
      { keyword: "account opening form", weight: 5 },
      { keyword: "account holder", weight: 3 },
      { keyword: "customer information", weight: 2 },
      { keyword: "beneficial owner", weight: 3 },
      { keyword: "iban", weight: 2 },
      { keyword: "identification", weight: 2 },
    ],
  },

  {
    domain: "Finance / Banking",
    documentType: "Loan Application",
    rules: [
      { keyword: "loan application", weight: 5 },
      { keyword: "loan amount", weight: 4 },
      { keyword: "loan applicant", weight: 3 },
      { keyword: "interest rate", weight: 2 },
      { keyword: "repayment", weight: 2 },
      { keyword: "monthly payment", weight: 3 },
      { keyword: "credit", weight: 2 },
      { keyword: "collateral", weight: 3 },
    ],
  },

  {
    domain: "Finance / Banking",
    documentType: "Income Statement",
    rules: [
      { keyword: "income statement", weight: 6 },
      { keyword: "revenue", weight: 3 },
      { keyword: "expenses", weight: 3 },
      { keyword: "net income", weight: 4 },
      { keyword: "operating income", weight: 3 },
      { keyword: "gross profit", weight: 3 },
      { keyword: "financial year", weight: 2 },
    ],
  },

  {
    domain: "Finance / Banking",
    documentType: "Balance Sheet",
    rules: [
      { keyword: "balance sheet", weight: 6 },
      { keyword: "assets", weight: 3 },
      { keyword: "liabilities", weight: 3 },
      { keyword: "equity", weight: 3 },
      { keyword: "current assets", weight: 2 },
      { keyword: "current liabilities", weight: 2 },
      { keyword: "total assets", weight: 3 },
    ],
  },

  {
    domain: "Finance / Banking",
    documentType: "Cash Flow Statement",
    rules: [
      { keyword: "cash flow statement", weight: 6 },
      { keyword: "cash flow", weight: 4 },
      { keyword: "operating activities", weight: 3 },
      { keyword: "investing activities", weight: 3 },
      { keyword: "financing activities", weight: 3 },
      { keyword: "cash and cash equivalents", weight: 3 },
    ],
  },

  // =========================
  // LEGAL
  // =========================

  {
    domain: "Legal",
    documentType: "Legal Contract",
    rules: [
      { keyword: "contract", weight: 4 },
      { keyword: "agreement", weight: 3 },
      { keyword: "parties", weight: 2 },
      { keyword: "clause", weight: 2 },
      { keyword: "terms and conditions", weight: 3 },
      { keyword: "obligation", weight: 2 },
      { keyword: "termination", weight: 2 },
      { keyword: "signature", weight: 1 },
    ],
  },

  {
    domain: "Legal",
    documentType: "Partnership Agreement",
    rules: [
      { keyword: "partnership agreement", weight: 6 },
      { keyword: "partners", weight: 3 },
      { keyword: "partnership", weight: 3 },
      { keyword: "profit sharing", weight: 3 },
      { keyword: "contribution", weight: 2 },
      { keyword: "partnership interest", weight: 3 },
    ],
  },

  {
    domain: "Legal",
    documentType: "Non-Disclosure Agreement",
    rules: [
      { keyword: "non-disclosure agreement", weight: 6 },
      { keyword: "nda", weight: 6 },
      { keyword: "confidential information", weight: 4 },
      { keyword: "confidentiality", weight: 4 },
      { keyword: "disclosure", weight: 2 },
      { keyword: "recipient", weight: 2 },
    ],
  },

  {
    domain: "Legal",
    documentType: "Lease Agreement",
    rules: [
      { keyword: "lease agreement", weight: 6 },
      { keyword: "rental agreement", weight: 5 },
      { keyword: "tenant", weight: 3 },
      { keyword: "landlord", weight: 3 },
      { keyword: "rent", weight: 2 },
      { keyword: "security deposit", weight: 3 },
      { keyword: "property", weight: 2 },
    ],
  },

  {
  domain: "Legal",
  documentType: "Bailiff Document",
  rules: [
    {
      keyword: "bailiff",
      weight: 4,
    },
    {
      keyword: "execution",
      weight: 3,
    },
    {
      keyword: "debtor",
      weight: 3,
    },
    {
      keyword: "creditor",
      weight: 3,
    },
    {
      keyword: "protocol number",
      weight: 2,
    },
    {
      keyword: "execution number",
      weight: 2,
    },
    {
      keyword: "bailiff office",
      weight: 3,
    },
    {
      keyword: "held amount",
      weight: 2,
    },
  ],
},

  // =========================
  // BUSINESS
  // =========================

  {
    domain: "Business",
    documentType: "Business Registration",
    rules: [
      { keyword: "business registration", weight: 5 },
      { keyword: "company registration", weight: 5 },
      { keyword: "registration number", weight: 3 },
      { keyword: "company number", weight: 3 },
      { keyword: "registered office", weight: 2 },
      { keyword: "incorporation", weight: 3 },
    ],
  },

  {
    domain: "Business",
    documentType: "Invoice",
    rules: [
      { keyword: "invoice", weight: 6 },
      { keyword: "invoice number", weight: 4 },
      { keyword: "billing address", weight: 3 },
      { keyword: "due date", weight: 3 },
      { keyword: "subtotal", weight: 2 },
      { keyword: "total amount", weight: 2 },
      { keyword: "vat", weight: 2 },
    ],
  },

  {
    domain: "Business",
    documentType: "Business Proposal",
    rules: [
      { keyword: "business proposal", weight: 6 },
      { keyword: "proposal", weight: 3 },
      { keyword: "project scope", weight: 3 },
      { keyword: "objectives", weight: 2 },
      { keyword: "budget", weight: 2 },
      { keyword: "deliverables", weight: 3 },
    ],
  },

  // =========================
  // GENERAL
  // =========================

  {
    domain: "General",
    documentType: "General Form",
    rules: [
      { keyword: "application form", weight: 3 },
      { keyword: "personal information", weight: 2 },
      { keyword: "date of birth", weight: 2 },
      { keyword: "address", weight: 1 },
      { keyword: "telephone", weight: 1 },
      { keyword: "email address", weight: 1 },
    ],
  },
];