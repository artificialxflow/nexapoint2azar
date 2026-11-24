/**
 * Smoke: Zod person/money schemas + seed parse (run: npm run test:people-p3)
 */
import assert from 'node:assert/strict';
import { seedPeople, seedReceipts, seedShareholders } from '../src/catalog/catalogSeed';
import {
  moneyDocumentSchema,
  personSchema,
  shareholderRecordSchema,
} from '../src/lib/erp/person-zod';

for (const p of seedPeople) {
  const parsed = personSchema.parse(p);
  assert.equal(parsed.id, p.id);
}

for (const doc of seedReceipts) {
  moneyDocumentSchema.parse(doc);
}

for (const sh of seedShareholders) {
  shareholderRecordSchema.parse(sh);
}

console.log('test-people-p3: ok');
