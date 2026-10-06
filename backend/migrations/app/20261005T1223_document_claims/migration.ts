#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2853618bc244490523053aac4bd8ee21e6717c2a281eabef2c7ec8cd70c88757/contract';
import startContract from '../../snapshots/2853618bc244490523053aac4bd8ee21e6717c2a281eabef2c7ec8cd70c88757/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/cd20370d3e63f946916b283deb98c70840a7b82717de1a40187e7a6326ea15e2/contract';
import endContract from '../../snapshots/cd20370d3e63f946916b283deb98c70840a7b82717de1a40187e7a6326ea15e2/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'document',
        column: col('activeWorkerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document',
        column: col('claimExpiresAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
