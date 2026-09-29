# Legal Document Classifier & JSON Generator

A full-stack web application that transforms unstructured documents into structured, validated JSON.

## Features

- Upload PDF, DOCX, CSV, and images
- Text extraction and OCR
- Rule-based document type classification
- Dynamic forms generated from JSON Schema
- JSON Schema validation with AJV
- Persistent document drafts
- Authentication and user-based authorization
- Admin dashboard for managing users and documents
- Document and extracted-text preview
- PostgreSQL database

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS  
**Backend:** Next.js, TypeScript, REST API  
**Database:** PostgreSQL, Prisma  
**Processing:** unpdf, Mammoth, csv-parse, Tesseract.js  
**Validation:** JSON Schema, AJV  
**Infrastructure:** Docker

## Running the Application

The application uses Docker for the PostgreSQL database and backend, while the frontend runs locally using Vite.

### 1. Start PostgreSQL and Backend

From the project root:

```bash
docker compose up --build
```

This starts:

- PostgreSQL database
- Next.js backend

```

### 2. Start the Frontend

Open a **new terminal** and run:

```bash
cd frontend
yarn install
yarn dev
```

```

## Development Setup

If the Docker containers have already been built, you can start them without rebuilding:

```bash
docker compose up
```

Then, in a separate terminal:

```bash
cd frontend
yarn dev
```

## Project Structure

```text
legal-document-classifier/
├── backend/          # Next.js backend and REST API
├── frontend/         # React + Vite frontend
├── docker-compose.yml
└── README.md
```

## Application URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |
| PostgreSQL | localhost:5432 |