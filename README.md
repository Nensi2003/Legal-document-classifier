Legal Document Classifier & JSON Generator

A full-stack web application that transforms unstructured documents into structured, validated JSON.

Features

Upload PDF, DOCX, CSV and images
Text extraction and OCR
Rule-based document type classification
Dynamic forms generated from JSON Schema
JSON Schema validation with AJV
Persistent document drafts
Authentication and user-based authorization
Document and extracted-text preview
PostgreSQL database

Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS  
**Backend:** Next.js, TypeScript, REST API  
**Database:** PostgreSQL, Prisma  
**Processing:** unpdf, Mammoth, csv-parse, Tesseract.js  
**Validation:** JSON Schema, AJV  
**Infrastructure:** Docker


Running Lockally 
# Start PostgreSQL
docker compose up -d

# Backend
cd backend
yarn install
yarn dev

# Frontend
cd frontend
yarn install
yarn dev 

Frontend: http://localhost:5173
Backend: http://localhost:3000
