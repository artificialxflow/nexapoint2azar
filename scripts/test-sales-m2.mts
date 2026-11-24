/**
 * Smoke test فاز ۲ — import سرویس‌ها (بدون DB اجباری)
 * npm run test:sales-m2
 */
import { crmLeadSchema, crmOpportunitySchema, phoneDirectoryEntrySchema } from '../src/lib/erp/person-zod';

const lead = crmLeadSchema.parse({
  name: 'FAUX-M2-LEAD-test',
  source: 'UAT',
  interest: 'test',
  registeredDate: '1404/01/01',
  status: 'جدید',
});

const opp = crmOpportunitySchema.parse({
  stageId: 'stage-1',
  title: 'FAUX-M2-OPP-test',
  expectedClose: '',
});

const phone = phoneDirectoryEntrySchema.parse({
  displayName: 'FAUX-M2-PHONE-test',
  mobile: '09121234567',
});

if (!lead.name || !opp.title || !phone.displayName) {
  console.error('schema parse failed');
  process.exit(1);
}
console.log('test:sales-m2 OK');
