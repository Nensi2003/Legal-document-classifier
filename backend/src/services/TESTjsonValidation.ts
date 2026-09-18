import { validateJSON } from "./jsonValidationService";

const bailiffSchema = {
  type: "object",
  properties: {
    debtors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          debtorType: {
            type: "string",
            enum: ["Individual", "Business"],
          },
          firstName: {
            type: "string",
          },
          middleName: {
            type: "string",
          },
          lastName: {
            type: "string",
          },
          birthDate: {
            type: "string",
            pattern: "^\\d{2}\\.\\d{2}\\.\\d{4}$",
          },
          personalSSN: {
            type: "string",
          },
          heldAmounts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                amount: {
                  type: "number",
                },
                currency: {
                  type: "string",
                },
              },
              required: ["amount", "currency"],
              additionalProperties: false,
            },
          },
        },
        required: ["debtorType"],
        additionalProperties: false,
      },
    },
    orderDetails: {
      type: "object",
      properties: {
        documentType: {
          type: "string",
        },
        bailiffOffice: {
          type: "string",
        },
        executionNumber: {
          type: "string",
        },
        executionDate: {
          type: "string",
          pattern: "^\\d{2}\\.\\d{2}\\.\\d{4}$",
        },
        protocolNumber: {
          type: "string",
        },
        protocolDate: {
          type: "string",
          pattern: "^\\d{2}-\\d{2}-\\d{4}$",
        },
        creditor: {
          type: "string",
        },
      },
      additionalProperties: false,
    },
  },
  required: ["debtors", "orderDetails"],
  additionalProperties: false,
};

const validData = {
  debtors: [
    {
      debtorType: "Individual",
      firstName: "Arben",
      middleName: "Ilir",
      lastName: "Hoxha",
      birthDate: "12.04.1987",
      personalSSN: "K70412031P",
      heldAmounts: [
        {
          amount: 125000,
          currency: "ALL",
        },
        {
          amount: 350.5,
          currency: "EUR",
        },
      ],
    },
  ],
  orderDetails: {
    documentType: "Order of Enforcement",
    bailiffOffice: "Tirana Private Bailiff Office",
    executionNumber: "EX-2026-00482",
    executionDate: "16.09.2026",
    protocolNumber: "PR-2026-1187",
    protocolDate: "16-09-2026",
    creditor: "Alba Finance SHPK",
  },
};

const result = validateJSON(
  validData,
  bailiffSchema
);

console.log(result);