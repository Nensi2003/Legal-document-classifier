#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1582b6dbe0fe48a9231c4a829ecc983934fba2d3fc8c35011835b90dd432ee8c/contract';
import startContract from '../../snapshots/1582b6dbe0fe48a9231c4a829ecc983934fba2d3fc8c35011835b90dd432ee8c/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fcac20a4ae3c4bfb7baee6442042c579f3fc359f9b1383d846a877bed27b609b/contract';
import endContract from '../../snapshots/fcac20a4ae3c4bfb7baee6442042c579f3fc359f9b1383d846a877bed27b609b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('role', 'text', {
          notNull: true,
          default: lit('USER'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
