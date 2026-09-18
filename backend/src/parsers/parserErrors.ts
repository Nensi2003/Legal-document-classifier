export class UnsupportedDocumentTypeError extends Error {
  constructor(mimeType: string) {
    super(`Unsupported document type: ${mimeType}`);
    this.name = "UnsupportedDocumentTypeError";
  }
}