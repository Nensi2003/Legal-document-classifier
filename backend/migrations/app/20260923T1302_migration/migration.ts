#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1582b6dbe0fe48a9231c4a829ecc983934fba2d3fc8c35011835b90dd432ee8c/contract';
import endContract from '../../snapshots/1582b6dbe0fe48a9231c4a829ecc983934fba2d3fc8c35011835b90dd432ee8c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/91d3d777c80044ee25391aa1b3cd57dec77fc9199559a212b135680c51641a69/contract';
import startContract from '../../snapshots/91d3d777c80044ee25391aa1b3cd57dec77fc9199559a212b135680c51641a69/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [];
  }
}

MigrationCLI.run(import.meta.url, M);
