import { randomUUID } from "node:crypto";
import type { RealtimeEvent, RealtimeEventType } from "./protocol";

type PublishTarget = "available" | `document:${number}`;
type Publisher = (target: PublishTarget, event: RealtimeEvent) => void;
const publisherKey = "__legalDocumentClassifierRealtimePublisher" as const;
type PublisherRegistry = typeof globalThis & { __legalDocumentClassifierRealtimePublisher?: Publisher };

export function registerRealtimePublisher(publisher: Publisher | null) {
  const registry = globalThis as PublisherRegistry;
  if (publisher) registry[publisherKey] = publisher;
  else delete registry[publisherKey];
}

export function createRealtimeEvent<TPayload extends Record<string, unknown>>(
  type: RealtimeEventType,
  documentId: number | undefined,
  userId: number | undefined,
  payload: TPayload,
): RealtimeEvent<TPayload> {
  return { eventId: randomUUID(), type, documentId, userId, timestamp: new Date().toISOString(), payload };
}

export function publishDocumentEvent(
  type: RealtimeEventType,
  documentId: number,
  userId: number,
  payload: Record<string, unknown> = {},
) {
  const registry = globalThis as PublisherRegistry;
  registry[publisherKey]?.(`document:${documentId}`, createRealtimeEvent(type, documentId, userId, payload));
}

export function publishAvailableEvent(documentId: number, userId: number, payload: Record<string, unknown>) {
  const registry = globalThis as PublisherRegistry;
  registry[publisherKey]?.("available", createRealtimeEvent("DOCUMENT_AVAILABLE", documentId, userId, payload));
}
