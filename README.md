# Legal Document Classifier

A web application for uploading legal documents, extracting and reviewing their contents, and generating structured JSON from versioned templates.

## Features

- Upload individual documents or publish batches for users to process
- Extract text from PDF, DOCX, CSV, and image files, with OCR for supported scans
- Review detected document boundaries and inspect source pages
- Create versioned document templates and generate schema-validated JSON
- Save drafts and resume document processing
- See document availability and active workers through real-time updates
- Manage users, published documents, and templates through the admin interface

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Next.js, TypeScript, REST API, WebSockets
- **Database:** PostgreSQL, Prisma
- **Document processing:** Mammoth, unpdf, csv-parse, Tesseract.js, LibreOffice, Poppler
- **Validation:** JSON Schema, AJV
- **Development environment:** Docker Compose

## Running the Application

1. Install and start Docker Desktop.
2. In the project root, make sure `.env` contains a `JWT_SECRET` value. Keep `.env` local; it is ignored by Git.
3. Build and start PostgreSQL, the backend, and the frontend:

   ```bash
   docker compose up --build -d
   ```

4. On a **new, empty database only**, initialize the schema and add the sample document templates:

   ```bash
   docker compose exec backend npx prisma db init
   docker compose exec backend yarn seed
   ```

   Skip this step if your Docker database already has the application schema and data.

5. Check that the services are running:

   ```bash
   docker compose ps
   ```

6. Open the frontend at `http://localhost:5173` and register an account or sign in.

To follow service logs, run `docker compose logs -f backend frontend`. Stop the application with `docker compose down`; this keeps the PostgreSQL data volume.

## Project Structure

```text
legal-document-classifier/
├── backend/
│   ├── migrations/             # Database migration history
│   ├── src/
│   │   ├── app/api/             # REST API routes
│   │   ├── classification/      # Document type detection
│   │   ├── detection/           # Page and boundary detection
│   │   ├── parsers/             # PDF, DOCX, CSV, and image extraction
│   │   ├── prisma/              # Database contract and seed data
│   │   ├── realtime/            # WebSocket events and connections
│   │   ├── services/            # Document, template, and user logic
│   │   └── test/                # Backend tests
│   └── realtime-server.ts       # Backend and WebSocket server entry point
├── frontend/
│   └── src/
│       ├── features/            # Admin, auth, dashboard, templates, documents
│       ├── test/                # Frontend tests
│       └── App.tsx              # Main application and screen navigation
├── docker-compose.yml           # PostgreSQL, backend, and frontend services
└── README.md
```

## Application URLs

| Service | URL |
|---|---|
| Frontend | [http://localhost:5173](http://localhost:5173) |
| Backend API | [http://localhost:3000](http://localhost:3000) |
| PostgreSQL | `localhost:5432` — database `legal_documents`, user `postgres` |
