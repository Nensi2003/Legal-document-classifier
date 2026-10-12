import { useEffect, useState } from "react";

import { AppLayout } from "./features/documents/components/AppLayout";
import { Dashboard } from "./features/dashboard/Dashboard";

import {
  getCurrentUser,
  logout,
  type User,
} from "./features/auth/api";

import { LoginForm } from "./features/auth/LoginForm";
import { RegisterForm } from "./features/auth/RegisterForm";

import { TemplatePage } from "./features/document-types/TemplatePage";


import {
  getDocumentById,
  claimDocument,
  releaseDocumentClaim,
  type Document,
} from "./features/documents/api";

import { UploadDocument } from "./features/documents/UploadDocument";
import { BatchUpload } from "./features/documents/BatchUpload";

import { DocumentForm } from "./features/documents/components/DocumentForm";
import { DocumentBoundaryReview } from "./features/documents/components/DocumentBoundaryReview";
import { DocumentTypeSelector } from "./features/documents/components/DocumentTypeSelector";

import { DocumentList } from "./features/documents/DocumentList";

import { parseDocument } from "./features/documents/parseApi";

import { AdminDashboard } from "./features/admin/AdminDashboard";

import { AdminUsers } from "./features/admin/AdminUsers";

import { AdminDocuments } from "./features/admin/AdminDocuments";

import { AdminDocumentTypes } from "./features/admin/AdminDocumentTypes";
import { realtimeClient } from "./features/realtime/realtimeClient";
import { DocumentCollaborationBar } from "./features/documents/components/DocumentCollaborationBar";

const SHARED_PAGES = ["documents", "upload", "batch-upload", "templates"];
const ADMIN_PAGES = ["admin-dashboard", "admin-users", "admin-documents", "admin-document-types"];

function getRestorablePage(page: string | null, role: string): string | null {
  if (!page) return null;
  if (SHARED_PAGES.includes(page)) return page;
  if (role === "ADMIN" && ADMIN_PAGES.includes(page)) return page;
  if (role !== "ADMIN" && page === "dashboard") return page;
  return null;
}

function updateAppUrl(page: string, documentId: number | null = null) {
  const url = new URL(window.location.href);
  if (page === "document" && documentId !== null) {
    url.searchParams.set("documentId", String(documentId));
    url.searchParams.delete("page");
  } else {
    url.searchParams.delete("documentId");
    url.searchParams.set("page", page);
  }

  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function App() {
  const [showRegister, setShowRegister] =
    useState(false);

  const [user, setUser] =
    useState<User | null>(null);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [currentPage, setCurrentPage] =
    useState("dashboard");

  const [selectedDocument, setSelectedDocument] =
    useState<Document | null>(null);


  // --------------------------------------------------
  // Check authentication
  // --------------------------------------------------

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();

        setUser(currentUser);

        if (currentUser) {
          const params = new URLSearchParams(window.location.search);
          const documentId = Number(params.get("documentId"));
          let restoredDocument = false;

          if (Number.isInteger(documentId) && documentId > 0) {
            try {
              const document = await getDocumentById(documentId);
              setSelectedDocument(document);
              setCurrentPage(document.status === "REVIEW" ? "boundary-review" : "document");
              updateAppUrl("document", document.id);
              restoredDocument = true;
            } catch (error) {
              console.error("Failed to restore the open document:", error);
            }
          }

          if (!restoredDocument) {
            const defaultPage = currentUser.role === "ADMIN" ? "admin-dashboard" : "dashboard";
            const page = getRestorablePage(params.get("page"), currentUser.role) ?? defaultPage;
            setCurrentPage(page);
            updateAppUrl(page);
          }
        }
      } catch (error) {
        console.error(
          "Failed to check authentication:",
          error
        );

        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    return realtimeClient.connect();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedDocument) return;
    if (selectedDocument.status === "COMPLETED") return realtimeClient.watchDocument(selectedDocument.id);
    const documentId = selectedDocument.id;
    const releaseRealtimeClaim = realtimeClient.claimDocument(documentId);
    return () => {
      releaseRealtimeClaim();
      void releaseDocumentClaim(documentId).catch((error) => {
        console.error("Failed to release document claim after leaving the workspace:", error);
      });
    };
  }, [user?.id, selectedDocument?.id]);

  useEffect(() => realtimeClient.onEvent((event) => {
    if (!event.documentId || !["DOCUMENT_STATUS_CHANGED", "DOCUMENT_COMPLETED", "DOCUMENT_UPDATED", "DOCUMENT_CLAIMED", "DOCUMENT_RELEASED"].includes(event.type)) return;
    setSelectedDocument((current) => {
      if (!current || current.id !== event.documentId) return current;
      const status = typeof event.payload.status === "string" ? event.payload.status : current.status;
      return { ...current, status,
        activeWorkerId: event.type === "DOCUMENT_RELEASED" ? null : event.type === "DOCUMENT_CLAIMED" ? event.userId ?? null : current.activeWorkerId,
        activeWorkerName: event.type === "DOCUMENT_RELEASED" ? null : event.type === "DOCUMENT_CLAIMED" ? String(event.payload.userName ?? "User") : current.activeWorkerName,
      };
    });
  }), []);


  // --------------------------------------------------
  // Loading
  // --------------------------------------------------

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Checking authentication...
          </p>
        </div>
      </main>
    );
  }


  // --------------------------------------------------
  // Login / Register
  // --------------------------------------------------

  if (!user) {
    return (
      <main>
        {showRegister ? (
          <RegisterForm
            onRegister={setUser}
            onBackToLogin={() =>
              setShowRegister(false)
            }
          />
        ) : (
          <LoginForm
  onLogin={(loggedInUser) => {
    setUser(loggedInUser);
    const defaultPage = loggedInUser.role === "ADMIN" ? "admin-dashboard" : "dashboard";
    const requestedPage = getRestorablePage(
      new URLSearchParams(window.location.search).get("page"),
      loggedInUser.role,
    );
    const page = requestedPage ?? defaultPage;
    setCurrentPage(page);
    updateAppUrl(page);
  }}
  onRegister={() =>
    setShowRegister(true)
  }
/>
        )}
      </main>
    );
  }

  // --------------------------------------------------
  // From this point onward, user is NOT null.
  // --------------------------------------------------


  // --------------------------------------------------
  // Logout
  // --------------------------------------------------

  async function handleLogout() {
    try {
      await logout();

      setUser(null);
      setSelectedDocument(null);
      setCurrentPage("dashboard");
      updateAppUrl("dashboard");
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );
    }
  }


  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  function handleNavigate(page: string) {
    setSelectedDocument(null);
    setCurrentPage(page);
    updateAppUrl(page);
  }

    // --------------------------------------------------
  // Admin Dashboard
  // --------------------------------------------------

  if (
    user.role === "ADMIN" &&
    currentPage === "admin-dashboard"
  ) {
    return (
      <AppLayout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        userName={user.name}
        userRole={user.role}
        onLogout={handleLogout}
      >
        <AdminDashboard
          onNavigate={handleNavigate}
        />
      </AppLayout>
    );
  }


  // --------------------------------------------------
// Admin Users
// --------------------------------------------------

if (
  user.role === "ADMIN" &&
  currentPage === "admin-users"
) {
  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      userName={user.name}
      userRole={user.role}
      onLogout={handleLogout}
    >
      <AdminUsers onNavigate={handleNavigate} />
    </AppLayout>
  );
}


// --------------------------------------------------
// Admin Documents
// --------------------------------------------------

if (
  user.role === "ADMIN" &&
  currentPage === "admin-documents"
) {
  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      userName={user.name}
      userRole={user.role}
      onLogout={handleLogout}
    >
      <AdminDocuments onNavigate={handleNavigate} />
    </AppLayout>
  );
}

// --------------------------------------------------
// Admin Document Types
// --------------------------------------------------

if (
  user.role === "ADMIN" &&
  currentPage === "admin-document-types"
) {
  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      userName={user.name}
      userRole={user.role}
      onLogout={handleLogout}
    >
      <AdminDocumentTypes
        onNavigate={handleNavigate}
        onBack={() =>
          handleNavigate("admin-dashboard")
        }
      />
    </AppLayout>
  );
}



  // --------------------------------------------------
  // Open document
  // --------------------------------------------------

  async function handleOpenDocument(
    documentId: number,
    keepBatchResults = false,
  ) {
    try {
      let document = await getDocumentById(documentId);
      if (user?.role !== "ADMIN" && document.status !== "COMPLETED") {
        const claimed = await claimDocument(documentId);
        document = await getDocumentById(documentId);
        if (claimed && document.parseStatus !== "SUCCESS" && document.status !== "REVIEW") {
          try {
            await parseDocument(documentId);
          } catch (parseError) {
            console.error("Failed to parse document after claiming it:", parseError);
          }
          document = await getDocumentById(documentId);
        }
      }

      setSelectedDocument(document);
      if (keepBatchResults) {
        updateAppUrl("batch-upload");
      } else {
        setCurrentPage("document");
        updateAppUrl("document", document.id);
      }
    } catch (error) {
      console.error(
        "Failed to load document:",
        error
      );
    }
  }


  // --------------------------------------------------
  // Open draft
  // --------------------------------------------------

  function handleOpenDocumentFromBatch(documentId: number) {
    return handleOpenDocument(documentId, true);
  }


  // --------------------------------------------------
  // Upload
  // --------------------------------------------------

  if (currentPage === "upload") {
    return (
      <AppLayout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        userName={user.name}
        userRole={user.role}
        onLogout={handleLogout}
      >
        <UploadDocument
          isAdmin={user.role === "ADMIN"}
          onBackToDashboard={() => handleNavigate("admin-dashboard")}
          onUploaded={async (documentId) => {
            if (user.role === "ADMIN") {
              setCurrentPage("admin-documents");
              updateAppUrl("admin-documents");
              return;
            }
            try {
              const claimed = await claimDocument(documentId);
              if (claimed) await parseDocument(documentId);

              const document =
                await getDocumentById(documentId);

              setSelectedDocument(document);
              setCurrentPage("document");
              updateAppUrl("document", document.id);
            } catch (error) {
              console.error(
                "Failed to parse uploaded document:",
                error
              );
            }
          }}
          onCancel={() =>
            handleNavigate("dashboard")
          }
        />
      </AppLayout>
    );
  }


  // --------------------------------------------------
  // Batch Upload
  // --------------------------------------------------

  if (currentPage === "batch-upload") {
    return (
      <AppLayout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        userName={user.name}
        userRole={user.role}
        onLogout={handleLogout}
      >
        <div className={selectedDocument ? "grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]" : ""}>
          <div className="min-w-0">
            <BatchUpload
              isAdmin={user.role === "ADMIN"}
              onBackToDashboard={() => handleNavigate("admin-dashboard")}
              onComplete={(result) => {
                console.log("Batch upload completed:", result);
              }}
              onCancel={() => handleNavigate("dashboard")}
              onOpenDocument={handleOpenDocumentFromBatch}
            />
          </div>

          {selectedDocument && (
            <aside className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
              <DocumentCollaborationBar documentId={selectedDocument.id} userId={user.id} activeWorkerId={selectedDocument.activeWorkerId} activeWorkerName={selectedDocument.activeWorkerName} />

              {selectedDocument.status === "REVIEW" ? (
                <DocumentBoundaryReview
                  documentId={selectedDocument.id}
                  fileName={selectedDocument.fileName}
                  mimeType={selectedDocument.mimeType}
                  readOnly={selectedDocument.activeWorkerId != null && selectedDocument.activeWorkerId !== user.id}
                  backLabel="← Back to batch results"
                  onBackToDocuments={() => {
                    setSelectedDocument(null);
                    updateAppUrl("batch-upload");
                  }}
                  onConfirmed={async () => {
                    try {
                      setSelectedDocument(await getDocumentById(selectedDocument.id));
                    } catch (error) {
                      console.error("Failed to reload document after confirming boundaries:", error);
                    }
                  }}
                />
              ) : !selectedDocument.documentTypeId ? (
                <div className="mt-4 rounded-xl border border-slate-200 p-5">
                  {selectedDocument.status === "COMPLETED" || (selectedDocument.activeWorkerId != null && selectedDocument.activeWorkerId !== user.id) ? (
                    <>
                      <h2 className="text-lg font-semibold text-slate-900">Document is read-only</h2>
                      <p className="mt-2 text-sm text-slate-500">
                        {selectedDocument.status === "COMPLETED" ? "This document is complete and read-only." : `Currently working: ${selectedDocument.activeWorkerName || "Another user"}. You can view this document, but cannot edit it.`}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold text-slate-900">Select Document Type</h2>
                      <p className="mt-2 text-sm text-slate-500">Choose the template that matches this document.</p>
                      <div className="mt-5">
                        <DocumentTypeSelector
                          documentId={selectedDocument.id}
                          onTypeSelected={(documentTypeId) => setSelectedDocument((current) => current ? { ...current, documentTypeId } : null)}
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <DocumentForm
                  documentId={selectedDocument.id}
                  userId={user.id}
                  activeWorkerId={selectedDocument.activeWorkerId}
                  activeWorkerName={selectedDocument.activeWorkerName}
                  backLabel="← Back to batch results"
                  compact
                  onBack={() => {
                    setSelectedDocument(null);
                    updateAppUrl("batch-upload");
                  }}
                />
              )}
            </aside>
          )}
        </div>
      </AppLayout>
    );
  }


  // --------------------------------------------------
  // Document Boundary Review
  // --------------------------------------------------

  if (
    currentPage === "boundary-review" &&
    selectedDocument !== null
  ) {
    return (
      <AppLayout
        currentPage="document"
        onNavigate={handleNavigate}
        userName={user.name}
        userRole={user.role}
        onLogout={handleLogout}
      >
        <DocumentBoundaryReview
  documentId={selectedDocument.id}
  fileName={selectedDocument.fileName}
          mimeType={selectedDocument.mimeType}
          readOnly={selectedDocument.status === "COMPLETED" || (selectedDocument.activeWorkerId != null && selectedDocument.activeWorkerId !== user.id)}
  onBackToDocuments={() => {
    setSelectedDocument(null);
    setCurrentPage("documents");
    updateAppUrl("documents");
  }}
  onConfirmed={async () => {
    try {
      const updatedDocument =
        await getDocumentById(selectedDocument.id);

      setSelectedDocument(updatedDocument);
      setCurrentPage("document");
      updateAppUrl("document", updatedDocument.id);
    } catch (error) {
      console.error(
        "Failed to reload document after boundary confirmation:",
        error
      );
    }
  }}
/>
        <DocumentCollaborationBar documentId={selectedDocument.id} userId={user.id} activeWorkerId={selectedDocument.activeWorkerId} activeWorkerName={selectedDocument.activeWorkerName} />
      </AppLayout>
    );
  }


  // --------------------------------------------------
  // Document Workspace
  // --------------------------------------------------

  if (
    currentPage === "document" &&
    selectedDocument !== null
  ) {

    console.log(
      "SELECTED DOCUMENT:",
      selectedDocument
    );

    console.log(
      "SELECTED DOCUMENT ID:",
      selectedDocument.id
    );

    console.log(
      "SELECTED DOCUMENT STATUS:",
      selectedDocument.status
    );


    // Multiple document instances require boundary review first.

    if (selectedDocument.status === "REVIEW") {
      return (
        <AppLayout
          currentPage="document"
          onNavigate={handleNavigate}
          userName={user.name}
          userRole={user.role}
          onLogout={handleLogout}
        >
          <DocumentCollaborationBar documentId={selectedDocument.id} userId={user.id} activeWorkerId={selectedDocument.activeWorkerId} activeWorkerName={selectedDocument.activeWorkerName} />
          <DocumentBoundaryReview
  documentId={selectedDocument.id}
  fileName={selectedDocument.fileName}
  mimeType={selectedDocument.mimeType}
  readOnly={selectedDocument.activeWorkerId != null && selectedDocument.activeWorkerId !== user.id}
  onBackToDocuments={() => {
    setSelectedDocument(null);
    setCurrentPage("documents");
    updateAppUrl("documents");
  }}
  onConfirmed={async () => {
    try {
      const updatedDocument =
        await getDocumentById(selectedDocument.id);

      setSelectedDocument(updatedDocument);
    } catch (error) {
      console.error(
        "Failed to reload document after confirming boundaries:",
        error
      );
    }
  }}
/>
        </AppLayout>
      );
    }


    // Document has no template yet

    if (!selectedDocument.documentTypeId) {
      return (
        <AppLayout
          currentPage="document"
          onNavigate={handleNavigate}
          userName={user.name}
          userRole={user.role}
          onLogout={handleLogout}
        >
          <button
            type="button"
            onClick={() => {
              setSelectedDocument(null);
              setCurrentPage("documents");
              updateAppUrl("documents");
            }}
            className="mb-6 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Back to Documents
          </button>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <DocumentCollaborationBar documentId={selectedDocument.id} userId={user.id} activeWorkerId={selectedDocument.activeWorkerId} activeWorkerName={selectedDocument.activeWorkerName} />
            <h1 className="text-2xl font-bold text-slate-900">
              {selectedDocument.status === "COMPLETED" || (selectedDocument.activeWorkerId != null && selectedDocument.activeWorkerId !== user.id) ? "Document is read-only" : "Select Document Type"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {selectedDocument.status === "COMPLETED" || (selectedDocument.activeWorkerId != null && selectedDocument.activeWorkerId !== user.id)
                ? selectedDocument.status === "COMPLETED" ? "This document is complete and read-only." : `Currently working: ${selectedDocument.activeWorkerName || "Another user"}. You can view this document, but cannot edit it.`
                : "Choose the template that matches this document."}
            </p>

            {selectedDocument.status !== "COMPLETED" && !(selectedDocument.activeWorkerId != null && selectedDocument.activeWorkerId !== user.id) && <div className="mt-6">
              <DocumentTypeSelector
                documentId={
                  selectedDocument.id
                }
                onTypeSelected={(
                  documentTypeId
                ) => {
                  setSelectedDocument(
                    (current) =>
                      current
                        ? {
                            ...current,
                            documentTypeId,
                          }
                        : null
                  );
                }}
              />
            </div>}
          </div>
        </AppLayout>
      );
    }


    // Document already has a template

    return (
      <AppLayout
        currentPage="document"
        onNavigate={handleNavigate}
        userName={user.name}
        userRole={user.role}
        onLogout={handleLogout}
      >
        <DocumentCollaborationBar documentId={selectedDocument.id} userId={user.id} activeWorkerId={selectedDocument.activeWorkerId} activeWorkerName={selectedDocument.activeWorkerName} />
        <DocumentForm
          documentId={
            selectedDocument.id
          }
          userId={user.id}
          activeWorkerId={selectedDocument.activeWorkerId}
          activeWorkerName={selectedDocument.activeWorkerName}
          onBack={() => {
            setSelectedDocument(null);
            setCurrentPage("documents");
            updateAppUrl("documents");
          }}
        />
      </AppLayout>
    );
  }


  // --------------------------------------------------
  // Documents
  // --------------------------------------------------

  if (currentPage === "documents") {
    return (
      <AppLayout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        userName={user.name}
        userRole={user.role}
        onLogout={handleLogout}
      >
        <DocumentList
          onOpenDocument={
            handleOpenDocument
          }
        />
      </AppLayout>
    );
  }


  // --------------------------------------------------
  // Templates
  // --------------------------------------------------

  if (currentPage === "templates") {
    return (
      <AppLayout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        userName={user.name}
        userRole={user.role}
        onLogout={handleLogout}
      >
        <TemplatePage canPublish />
      </AppLayout>
    );
  }


  // --------------------------------------------------
  // Default Dashboard
  // --------------------------------------------------

  return (
    <AppLayout
      currentPage="dashboard"
      onNavigate={handleNavigate}
      userName={user.name}
      userRole={user.role}
      onLogout={handleLogout}
    >
      <Dashboard
        onNavigate={handleNavigate}
      />
    </AppLayout>
  );
}


export default App;
