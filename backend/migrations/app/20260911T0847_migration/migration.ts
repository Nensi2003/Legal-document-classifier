#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/45ac7f209aa11fa19d5c2f44443b8e33a43e8922cb7b4ad73542720b5792e8ed/contract';
import startContract from '../../snapshots/45ac7f209aa11fa19d5c2f44443b8e33a43e8922cb7b4ad73542720b5792e8ed/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/91d3d777c80044ee25391aa1b3cd57dec77fc9199559a212b135680c51641a69/contract';
import endContract from '../../snapshots/91d3d777c80044ee25391aa1b3cd57dec77fc9199559a212b135680c51641a69/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'session',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'session',
        index: 'session_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'session',
        foreignKey: {
          name: 'session_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
