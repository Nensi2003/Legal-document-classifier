import { useEffect, useState } from "react";

import { AppLayout } from "./features/documents/components/AppLayout";import { Dashboard } from "./features/dashboard/Dashboard";

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
import { DocumentTypeSelector } from "./features/documents/components/DocumentTypeSelector";

import { DocumentList } from "./features/documents/DocumentList";

import { parseDocument } from "./features/documents/parseApi";


 

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
        const params = new URLSearchParams(
          window.location.search
        );

        const documentIdParam =
          params.get("documentId");

        if (documentIdParam) {
          const documentId = Number(documentIdParam);

          if (Number.isInteger(documentId)) {
            try {
              const document =
                await getDocumentById(documentId);

              setSelectedDocument(document);
              setCurrentPage("document");
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
            onLogin={setUser}
            onRegister={() =>
              setShowRegister(true)
            }
          />
        )}
      </main>
    );
  }


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

  function handleOpenDraft(documentId: number) {
  window.open(
    `${window.location.origin}?documentId=${documentId}`,
    "_blank"
  );
}


  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  function handleNavigate(page: string) {
    setSelectedDocument(null);
    setCurrentPage(page);
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
        onLogout={handleLogout}
      >
        <UploadDocument
          onUploaded={async (documentId) => {
            try {
              await parseDocument(
                documentId
              );

              const document =
                await getDocumentById(
                  documentId
                );

              setSelectedDocument(
                document
              );

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
  // Document workspace
  // --------------------------------------------------

  if (
    currentPage === "document" &&
    selectedDocument !== null
  ) {
    // Document has no template yet
    if (
      !selectedDocument.documentTypeId
    ) {
      return (
        <AppLayout
          currentPage="document"
          onNavigate={handleNavigate}
          userName={user.name}
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
        onLogout={handleLogout}
      >
        <TemplatePage />
      </AppLayout>
    );
  }


  // --------------------------------------------------
  // Dashboard
  // --------------------------------------------------

  return (
    <AppLayout
      currentPage="dashboard"
      onNavigate={handleNavigate}
      userName={user.name}
      onLogout={handleLogout}
    >
      <Dashboard
        onNavigate={handleNavigate}
      />
    </AppLayout>
  );
}


export default App;