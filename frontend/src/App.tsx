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

import { DraftList } from "./features/documents/DraftList";

import {
  getDocumentById,
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
  setCurrentPage(
    currentUser.role === "ADMIN"
      ? "admin-dashboard"
      : "dashboard"
  );

  const params = new URLSearchParams(
    window.location.search
  );

          const documentIdParam =
            params.get("documentId");

          if (documentIdParam) {
            const documentId = Number(
              documentIdParam
            );

            if (Number.isInteger(documentId)) {
              try {
                const document =
                  await getDocumentById(documentId);

                setSelectedDocument(document);

                if (document.status === "REVIEW") {
                  setCurrentPage(
                    "boundary-review"
                  );
                } else {
                  setCurrentPage("document");
                }
              } catch (error) {
                console.error(
                  "Failed to load draft document:",
                  error
                );
              }
            }
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

    setCurrentPage(
      loggedInUser.role === "ADMIN"
        ? "admin-dashboard"
        : "dashboard"
    );
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
    documentId: number
  ) {
    try {
      const document =
        await getDocumentById(documentId);

      setSelectedDocument(document);
      setCurrentPage("document");
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

  function handleOpenDraft(
    documentId: number
  ) {
    window.open(
      `${window.location.origin}?documentId=${documentId}`,
      "_blank"
    );
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
          onUploaded={async (documentId) => {
            try {
              await parseDocument(documentId);

              const document =
                await getDocumentById(documentId);

              setSelectedDocument(document);
              setCurrentPage("document");
            } catch (error) {
              console.error(
                "Failed to parse uploaded document:",
                error
              );
            }
          }}
          onCancel={() =>
            setCurrentPage("dashboard")
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
        <BatchUpload
          onComplete={(result) => {
            console.log(
              "Batch upload completed:",
              result
            );
          }}
          onCancel={() =>
            setCurrentPage("dashboard")
          }
          onOpenDraft={handleOpenDraft}
        />
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
  onConfirmed={async () => {
    try {
      const updatedDocument =
        await getDocumentById(selectedDocument.id);

      setSelectedDocument(updatedDocument);
      setCurrentPage("document");
    } catch (error) {
      console.error(
        "Failed to reload document after boundary confirmation:",
        error
      );
    }
  }}
/>
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
          <DocumentBoundaryReview
  documentId={selectedDocument.id}
  fileName={selectedDocument.fileName}
  mimeType={selectedDocument.mimeType}
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
            }}
            className="mb-6 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Back to Documents
          </button>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">
              Select Document Type
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Choose the template that matches
              this document.
            </p>

            <div className="mt-6">
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
            </div>
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
        <DocumentForm
          documentId={
            selectedDocument.id
          }
          onBack={() => {
            setSelectedDocument(null);
            setCurrentPage("documents");
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
  // Drafts
  // --------------------------------------------------

  if (currentPage === "drafts") {
    return (
      <AppLayout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        userName={user.name}
        userRole={user.role}
        onLogout={handleLogout}
      >
        <DraftList
          onSelectDraft={async (
            documentId: number
          ) => {
            try {
              const document =
                await getDocumentById(
                  documentId
                );

              setSelectedDocument(
                document
              );

              setCurrentPage(
                "document"
              );
            } catch (error) {
              console.error(
                "Failed to load draft:",
                error
              );
            }
          }}
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
        <TemplatePage />
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