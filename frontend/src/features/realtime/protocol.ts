export type RealtimeEventType =
  | "CONNECTED" | "SUBSCRIBED" | "SUBSCRIPTION_REJECTED"
  | "DOCUMENT_AVAILABLE" | "DOCUMENT_OPENED" | "DOCUMENT_CLAIMED"
  | "DOCUMENT_RELEASED" | "DOCUMENT_PRESENCE" | "DOCUMENT_UPDATED"
  | "DOCUMENT_STATUS_CHANGED" | "DOCUMENT_COMPLETED" | "DOCUMENT_JSON_UPDATED"
  | "DOCUMENT_DELETED";

export interface RealtimeEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  type: RealtimeEventType;
  documentId?: number;
  userId?: number;
  timestamp: string;
  payload: TPayload;
}

export interface ActiveDocumentWorker {
  userId: number;
  userName: string | null;
}

