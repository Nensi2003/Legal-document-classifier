#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/fcac20a4ae3c4bfb7baee6442042c579f3fc359f9b1383d846a877bed27b609b/contract';
import startContract from '../../snapshots/fcac20a4ae3c4bfb7baee6442042c579f3fc359f9b1383d846a877bed27b609b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/2853618bc244490523053aac4bd8ee21e6717c2a281eabef2c7ec8cd70c88757/contract';
import endContract from '../../snapshots/2853618bc244490523053aac4bd8ee21e6717c2a281eabef2c7ec8cd70c88757/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  rawSql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'documentTypeVersion',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('documentTypeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('jsonSchema', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('publishedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('DRAFT'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('versionNumber', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'document',
        column: col('documentTypeVersionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'field',
        column: col('documentTypeVersionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      rawSql({
        id: 'data.document-type-version-v1-backfill',
        label: 'Backfill existing document type versions',
        summary: 'Copies existing schemas, fields, and document version links into version 1.',
        operationClass: 'data',
        target: { id: 'postgres', details: { schema: 'public', objectType: 'table', name: 'documentTypeVersion' } },
        precheck: [],
        execute: [{
          description: 'copy legacy document types, fields, and documents to version 1',
          sql: `INSERT INTO "public"."documentTypeVersion" ("documentTypeId", "versionNumber", "jsonSchema", "status", "publishedAt", "updatedAt")
SELECT dt."id", 1, dt."jsonSchema", 'ACTIVE', now(), now()
FROM "public"."documentType" dt
WHERE NOT EXISTS (SELECT 1 FROM "public"."documentTypeVersion" v WHERE v."documentTypeId" = dt."id" AND v."versionNumber" = 1);
UPDATE "public"."document" d SET "documentTypeVersionId" = v."id"
FROM "public"."documentTypeVersion" v
WHERE d."documentTypeId" = v."documentTypeId" AND v."versionNumber" = 1 AND d."documentTypeVersionId" IS NULL;
UPDATE "public"."field" f SET "documentTypeVersionId" = v."id"
FROM "public"."documentTypeVersion" v
WHERE f."documentTypeId" = v."documentTypeId" AND v."versionNumber" = 1 AND f."documentTypeVersionId" IS NULL;
CREATE UNIQUE INDEX "documentTypeVersion_type_version_key" ON "public"."documentTypeVersion" ("documentTypeId", "versionNumber");
CREATE UNIQUE INDEX "documentTypeVersion_one_active_per_type_key" ON "public"."documentTypeVersion" ("documentTypeId") WHERE "status" = 'ACTIVE';`,
        }],
        postcheck: [],
      } as never),
      this.setNotNull({ schema: 'public', table: 'field', column: 'documentTypeVersionId' }),
      this.dropConstraint({ schema: 'public', table: 'field', constraint: 'field_documentTypeId_fkey', kind: 'foreignKey' }),
      this.dropIndex({ schema: 'public', table: 'field', index: 'field_documentTypeId_idx_878907da' }),
      this.dropColumn({ schema: 'public', table: 'field', column: 'documentTypeId' }),
      this.dropColumn({ schema: 'public', table: 'documentType', column: 'jsonSchema' }),
      this.createIndex({
        schema: 'public',
        table: 'document',
        index: 'document_documentTypeVersionId_idx_0838791d',
        columns: ['documentTypeVersionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'documentTypeVersion',
        index: 'documentTypeVersion_documentTypeId_idx_878907da',
        columns: ['documentTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'field',
        index: 'field_documentTypeVersionId_idx_0838791d',
        columns: ['documentTypeVersionId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documentTypeVersion',
        foreignKey: {
          name: 'documentTypeVersion_documentTypeId_fkey',
          columns: ['documentTypeId'],
          references: { schema: 'public', table: 'documentType', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'document',
        foreignKey: {
          name: 'document_documentTypeVersionId_fkey',
          columns: ['documentTypeVersionId'],
          references: { schema: 'public', table: 'documentTypeVersion', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'field',
        foreignKey: {
          name: 'field_documentTypeVersionId_fkey',
          columns: ['documentTypeVersionId'],
          references: { schema: 'public', table: 'documentTypeVersion', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
