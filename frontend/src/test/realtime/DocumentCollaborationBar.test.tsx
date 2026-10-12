import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";

const { onEventMock } = vi.hoisted(() => ({ onEventMock: vi.fn() }));
vi.mock("../../features/realtime/realtimeClient", () => ({
  realtimeClient: { onEvent: onEventMock },
}));

import { DocumentCollaborationBar } from "../../features/documents/components/DocumentCollaborationBar";

describe("DocumentCollaborationBar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses green for your own work and red for another active worker", () => {
    let receiveEvent: ((event: unknown) => void) | undefined;
    onEventMock.mockImplementation((listener: (event: unknown) => void) => {
      receiveEvent = listener;
      return () => undefined;
    });
    render(<DocumentCollaborationBar documentId={7} userId={1} />);

    expect(screen.getByText("You are working on this document")).toHaveClass("bg-green-50", "text-green-700");
    act(() => receiveEvent?.({
      eventId: "presence-1",
      type: "DOCUMENT_PRESENCE",
      documentId: 7,
      timestamp: new Date().toISOString(),
      payload: { users: [{ userId: 1, userName: "Me" }, { userId: 2, userName: "Alex" }] },
    }));

    expect(screen.getByText("Currently working: Alex")).toHaveClass("bg-red-50", "text-red-700");
  });

  it("shows the server-reported worker immediately before realtime presence arrives", () => {
    render(<DocumentCollaborationBar documentId={7} userId={1} activeWorkerId={2} activeWorkerName="Test User" />);

    expect(screen.getByText("Currently working: Test User")).toHaveClass("bg-red-50", "text-red-700");
    expect(screen.queryByText("You are working on this document")).not.toBeInTheDocument();
  });
});
