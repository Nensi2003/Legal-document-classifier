import { db } from "@/prisma/db";
import type { JsonValue } from "@prisma/orm-postgres/target/codec-types";

const documentTypes: {
  name: string;
  domain: string;
  description: string;
  jsonSchema: JsonValue;
}[] = [
  {
    name: "CV / Resume",
    domain: "HR / Employment",
    description: "Curriculum vitae or resume document.",
    jsonSchema: {
      type: "object",
      properties: {
        firstName: { type: "string", minLength: 1 },
        lastName: { type: "string", minLength: 1 },
        email: { type: "string", format: "email" },
        phone: { type: "string" },
        education: { type: "string" },
        experience: { type: "string" },
        skills: { type: "string" }
      },
      required: ["firstName", "lastName", "email"],
      additionalProperties: false
    }
  },

  {
    name: "Employment Contract",
    domain: "HR / Employment",
    description: "Contract between an employer and employee.",
    jsonSchema: {
      type: "object",
      properties: {
        employeeName: { type: "string", minLength: 1 },
        employerName: { type: "string", minLength: 1 },
        position: { type: "string" },
        startDate: { type: "string" },
        salary: { type: "number" },
        contractType: { type: "string" }
      },
      required: ["employeeName", "employerName", "position"],
      additionalProperties: false
    }
  },

  {
    name: "Performance Review",
    domain: "HR / Employment",
    description: "Employee performance evaluation.",
    jsonSchema: {
      type: "object",
      properties: {
        employeeName: { type: "string" },
        reviewerName: { type: "string" },
        reviewDate: { type: "string" },
        rating: { type: "number" },
        comments: { type: "string" }
      },
      required: ["employeeName", "reviewerName"],
      additionalProperties: false
    }
  },

  {
    name: "Payroll Record",
    domain: "HR / Employment",
    description: "Employee payroll or salary record.",
    jsonSchema: {
      type: "object",
      properties: {
        employeeName: { type: "string" },
        employeeId: { type: "string" },
        payPeriod: { type: "string" },
        grossSalary: { type: "number" },
        netSalary: { type: "number" },
        deductions: { type: "number" }
      },
      required: ["employeeName", "payPeriod"],
      additionalProperties: false
    }
  },

  {
    name: "Leave Application",
    domain: "HR / Employment",
    description: "Employee request for leave.",
    jsonSchema: {
      type: "object",
      properties: {
        employeeName: { type: "string" },
        leaveType: { type: "string" },
        startDate: { type: "string" },
        endDate: { type: "string" },
        reason: { type: "string" }
      },
      required: ["employeeName", "leaveType", "startDate", "endDate"],
      additionalProperties: false
    }
  },

  {
    name: "Bank Statement",
    domain: "Finance / Banking",
    description: "Bank account statement.",
    jsonSchema: {
      type: "object",
      properties: {
        accountHolder: { type: "string" },
        accountNumber: { type: "string" },
        bankName: { type: "string" },
        statementPeriod: { type: "string" },
        openingBalance: { type: "number" },
        closingBalance: { type: "number" }
      },
      required: ["accountHolder", "accountNumber", "bankName"],
      additionalProperties: false
    }
  },

  {
    name: "Account Opening Form",
    domain: "Finance / Banking",
    description: "Application for opening a bank account.",
    jsonSchema: {
      type: "object",
      properties: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        dateOfBirth: { type: "string" },
        address: { type: "string" },
        accountType: { type: "string" }
      },
      required: ["firstName", "lastName", "accountType"],
      additionalProperties: false
    }
  },

  {
    name: "Loan Application",
    domain: "Finance / Banking",
    description: "Application for a loan.",
    jsonSchema: {
      type: "object",
      properties: {
        applicantName: { type: "string" },
        loanAmount: { type: "number" },
        loanPurpose: { type: "string" },
        income: { type: "number" },
        employmentStatus: { type: "string" }
      },
      required: ["applicantName", "loanAmount", "loanPurpose"],
      additionalProperties: false
    }
  },

  {
    name: "Income Statement",
    domain: "Finance / Banking",
    description: "Statement of company revenues and expenses.",
    jsonSchema: {
      type: "object",
      properties: {
        companyName: { type: "string" },
        reportingPeriod: { type: "string" },
        revenue: { type: "number" },
        expenses: { type: "number" },
        netIncome: { type: "number" }
      },
      required: ["companyName", "reportingPeriod"],
      additionalProperties: false
    }
  },

  {
    name: "Balance Sheet",
    domain: "Finance / Banking",
    description: "Statement of company assets, liabilities and equity.",
    jsonSchema: {
      type: "object",
      properties: {
        companyName: { type: "string" },
        reportingDate: { type: "string" },
        assets: { type: "number" },
        liabilities: { type: "number" },
        equity: { type: "number" }
      },
      required: ["companyName", "reportingDate"],
      additionalProperties: false
    }
  },

  {
    name: "Cash Flow Statement",
    domain: "Finance / Banking",
    description: "Statement of cash inflows and outflows.",
    jsonSchema: {
      type: "object",
      properties: {
        companyName: { type: "string" },
        reportingPeriod: { type: "string" },
        operatingCashFlow: { type: "number" },
        investingCashFlow: { type: "number" },
        financingCashFlow: { type: "number" }
      },
      required: ["companyName", "reportingPeriod"],
      additionalProperties: false
    }
  },

  {
    name: "Legal Contract",
    domain: "Legal",
    description: "General legal agreement or contract.",
    jsonSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        parties: { type: "string" },
        effectiveDate: { type: "string" },
        expirationDate: { type: "string" },
        terms: { type: "string" }
      },
      required: ["title", "parties"],
      additionalProperties: false
    }
  },

  {
    name: "Partnership Agreement",
    domain: "Legal",
    description: "Agreement establishing a business partnership.",
    jsonSchema: {
      type: "object",
      properties: {
        partnershipName: { type: "string" },
        partners: { type: "string" },
        businessPurpose: { type: "string" },
        ownershipShares: { type: "string" },
        effectiveDate: { type: "string" }
      },
      required: ["partnershipName", "partners"],
      additionalProperties: false
    }
  },

  {
    name: "Non-Disclosure Agreement",
    domain: "Legal",
    description: "Agreement protecting confidential information.",
    jsonSchema: {
      type: "object",
      properties: {
        parties: { type: "string" },
        effectiveDate: { type: "string" },
        confidentialInformation: { type: "string" },
        duration: { type: "string" }
      },
      required: ["parties", "effectiveDate"],
      additionalProperties: false
    }
  },

  {
    name: "Lease Agreement",
    domain: "Legal",
    description: "Agreement for renting or leasing property.",
    jsonSchema: {
      type: "object",
      properties: {
        landlord: { type: "string" },
        tenant: { type: "string" },
        propertyAddress: { type: "string" },
        startDate: { type: "string" },
        endDate: { type: "string" },
        monthlyRent: { type: "number" }
      },
      required: ["landlord", "tenant", "propertyAddress"],
      additionalProperties: false
    }
  },

  {
    name: "Business Registration",
    domain: "Business",
    description: "Business or company registration document.",
    jsonSchema: {
      type: "object",
      properties: {
        businessName: { type: "string" },
        registrationNumber: { type: "string" },
        businessType: { type: "string" },
        address: { type: "string" },
        ownerName: { type: "string" }
      },
      required: ["businessName", "registrationNumber"],
      additionalProperties: false
    }
  },

  {
    name: "Invoice",
    domain: "Business",
    description: "Invoice for goods or services.",
    jsonSchema: {
      type: "object",
      properties: {
        invoiceNumber: { type: "string" },
        date: { type: "string" },
        seller: { type: "string" },
        buyer: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" }
      },
      required: ["invoiceNumber", "date", "amount"],
      additionalProperties: false
    }
  },

  {
    name: "Business Proposal",
    domain: "Business",
    description: "Proposal for a business project or service.",
    jsonSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        companyName: { type: "string" },
        clientName: { type: "string" },
        description: { type: "string" },
        budget: { type: "number" }
      },
      required: ["title", "companyName"],
      additionalProperties: false
    }
  },

  {
  name: "Bailiff Document",
  domain: "Legal",
  description: "Document related to bailiff enforcement proceedings, debtors, held amounts, and execution order details.",
  jsonSchema: {
    type: "object",

    properties: {
      debtors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            debtorType: {
              type: "string",
              enum: ["Individual", "Business"]
            },

            firstName: {
              type: "string"
            },

            middleName: {
              type: "string"
            },

            lastName: {
              type: "string"
            },

            birthDate: {
              type: "string",
              pattern: "^\\d{2}\\.\\d{2}\\.\\d{4}$"
            },

            personalSSN: {
              type: "string"
            },

            heldAmounts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  amount: {
                    type: "number"
                  },

                  currency: {
                    type: "string"
                  }
                },
                required: ["amount", "currency"],
                additionalProperties: false
              }
            }
          },

          required: ["debtorType"],
          additionalProperties: false
        }
      },

      orderDetails: {
        type: "object",
        properties: {
          documentType: {
            type: "string"
          },

          bailiffOffice: {
            type: "string"
          },

          executionNumber: {
            type: "string"
          },

          executionDate: {
            type: "string",
            pattern: "^\\d{2}\\.\\d{2}\\.\\d{4}$"
          },

          protocolNumber: {
            type: "string"
          },

          protocolDate: {
            type: "string",
            pattern: "^\\d{2}-\\d{2}-\\d{4}$"
          },

          creditor: {
            type: "string"
          }
        },

        additionalProperties: false
      }
    },

    required: ["debtors", "orderDetails"],
    additionalProperties: false
  }
},

  {
    name: "General Form",
    domain: "General",
    description: "Generic form for documents that do not fit another category.",
    jsonSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        surname: { type: "string" },
        id: { type: "string" },
        notes: { type: "string" }
      },
      required: [],
      additionalProperties: false
    }
  }
  
];

export async function seedDocumentTypes() {
  for (const documentType of documentTypes) {
    const existing = await db.orm.public.DocumentType
      .where({ name: documentType.name })
      .first();

    if (existing) {
      console.log(`${documentType.name} already exists.`);
      continue;
    }

    await db.orm.public.DocumentType.create({
      name: documentType.name,
      domain: documentType.domain,
      description: documentType.description,
      jsonSchema: documentType.jsonSchema,
    });

    console.log(`Created: ${documentType.name}`);
  }
}