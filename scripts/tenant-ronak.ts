/**
 * Fixture tenant «رونام» (UAT) — داده فیک جامع + پاکسازی کامل (فعال/بایگانی/legacy روناک).
 *
 *   npm run db:tenant-ronak -- --create [--owner=admin]
 *   npm run db:tenant-ronak -- --recreate [--owner=admin]
 *   npm run db:tenant-ronak -- --dry-run
 *   npm run db:tenant-ronak -- --destroy --confirm
 */
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/db/prisma';
import {
  seedPayments,
  seedPeople,
  seedPersonCategories,
  seedPersonGroups,
  seedPriceLists,
  seedProductCategories,
  seedProducts,
  seedReceipts,
  seedShareholders,
  seedVendors,
} from '../src/catalog/catalogSeed';
import { DEFAULT_FISCAL_YEAR, defaultBusinessExpiry } from '../src/lib/business/defaults';
import { saveBlogModule, saveCommerceModule, saveStoreModule } from '../src/lib/erp/commerce-service';
import { createCrmLead, createCrmVisit, savePeopleModule } from '../src/lib/erp/people-service';
import { saveProductionModule, saveWarehouseModule } from '../src/lib/erp/production-service';
import { personSchema } from '../src/lib/erp/person-zod';
import {
  saveCalendarSnapshotToDb,
  saveChatSnapshotToDb,
  saveLettersSnapshotToDb,
  saveRequestsSnapshotToDb,
} from '../src/lib/meizito/comms-db-service';
import {
  createMockCalendarSnapshot,
  createMockChatSnapshot,
  createMockLettersSnapshot,
  createMockRequestsSnapshot,
  createMockWorkspaceSnapshot,
} from '../src/lib/meizito/mock-bootstrap';
import { saveWorkspaceSnapshotToDb } from '../src/lib/meizito/workspace/workspace-db-service';
import { saveCatalogModule } from '../src/lib/products/catalog-service';
import type { MoneyDocument, Person } from '../src/types/person';
import type { Product } from '../src/types/product';

import {
  ALL_FIXTURE_CREDIT_LABELS,
  ALL_FIXTURE_USER_PREFIXES,
  FIXTURE_BUSINESS_NAME,
  FIXTURE_CREDIT_LABEL,
  FIXTURE_ID_PREFIX,
  FIXTURE_USER_PREFIX,
} from '../src/lib/business/fixture';

const FIXTURE_PASSWORD = 'RonamTest1404!';

const dryRun = process.argv.includes('--dry-run');
const create = process.argv.includes('--create');
const recreate = process.argv.includes('--recreate');
const destroy = process.argv.includes('--destroy');
const confirm = process.argv.includes('--confirm');
const ownerArg = process.argv.find((a) => a.startsWith('--owner='))?.split('=')[1]?.trim();

const pid = (legacyId: string) => `${FIXTURE_ID_PREFIX}-p${legacyId}`;
const rid = (id: string) => `${FIXTURE_ID_PREFIX}-${id}`;

function remapPerson(p: Person): Person {
  return personSchema.parse({ ...structuredClone(p), id: pid(p.id) });
}

function remapMoneyDoc(doc: MoneyDocument): MoneyDocument {
  return {
    ...structuredClone(doc),
    id: rid(doc.id),
    lines: doc.lines.map((l) => ({
      ...l,
      id: rid(l.id),
      ...(l.personId ? { personId: pid(l.personId) } : {}),
    })),
    notes: doc.notes ? [...doc.notes] : undefined,
    history: doc.history?.map((h) => ({ ...h, id: rid(h.id) })),
  };
}

async function findActiveFixtureBusiness() {
  return prisma.business.findFirst({
    where: { creditLabel: FIXTURE_CREDIT_LABEL, status: 'active' },
    include: { members: true },
  });
}

async function listAllFixtureBusinesses() {
  return prisma.business.findMany({
    where: {
      OR: [
        { creditLabel: { in: [...ALL_FIXTURE_CREDIT_LABELS] } },
        { creditLabel: { startsWith: 'fixture:' } },
      ],
    },
    select: { id: true, name: true, status: true, creditLabel: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function resolveOwnerId(): Promise<string> {
  if (ownerArg) {
    const u = await prisma.user.findUnique({ where: { username: ownerArg } });
    if (!u) throw new Error(`کاربر مالک یافت نشد: ${ownerArg}`);
    return u.id;
  }
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (admin) return admin.id;
  const superUser = await prisma.user.findFirst({
    where: { systemRole: { slug: 'super_admin' } },
  });
  if (!superUser) throw new Error('مالک مشخص نیست — --owner=username بدهید.');
  return superUser.id;
}

async function fixtureUserIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      OR: ALL_FIXTURE_USER_PREFIXES.map((prefix) => ({
        username: { startsWith: prefix },
      })),
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function ensureFixtureTeamUsers(businessId: string, ownerId: string) {
  const role =
    (await prisma.systemRole.findFirst({ where: { slug: 'manager' } })) ??
    (await prisma.systemRole.findFirst({ where: { slug: 'sales' } }));
  if (!role) throw new Error('نقش manager/sales در دیتابیس نیست.');

  const hash = await bcrypt.hash(FIXTURE_PASSWORD, 12);
  const roster = [
    { username: `${FIXTURE_USER_PREFIX}sara`, displayName: 'سارا رونامی', mobile: '09121110001' },
    { username: `${FIXTURE_USER_PREFIX}reza`, displayName: 'رضا رونامی', mobile: '09121110002' },
  ];

  const memberIds: string[] = [ownerId];

  for (const r of roster) {
    const user = await prisma.user.upsert({
      where: { username: r.username },
      create: {
        username: r.username,
        mobilePhone: r.mobile,
        passwordHash: hash,
        displayName: r.displayName,
        status: 'active',
        systemRoleId: role.id,
      },
      update: {
        displayName: r.displayName,
        status: 'active',
        passwordHash: hash,
      },
    });
    memberIds.push(user.id);
    await prisma.businessMember.upsert({
      where: { businessId_userId: { businessId, userId: user.id } },
      create: { businessId, userId: user.id, role: 'member', joinedAt: new Date() },
      update: { role: 'member' },
    });
  }

  return { memberIds, teamNames: roster.map((r) => r.displayName) };
}

function buildWorkspaceSnapshot(
  teamNames: string[],
  opts?: { assigneeUserId?: string; projectMemberPersonIds?: string[] },
) {
  const assigneeUserId = opts?.assigneeUserId;
  const projectMemberPersonIds = opts?.projectMemberPersonIds ?? [];
  const snap = createMockWorkspaceSnapshot();
  const prefix = FIXTURE_ID_PREFIX;
  snap.boards = snap.boards.map((b) => ({
    ...b,
    id: `${prefix}-${b.id}`,
    name: 'میز کار روناک',
    memberNames: teamNames,
    columnIds: b.columnIds.map((c) => `${prefix}-${c}`),
    labelPalette: b.labelPalette?.map((l) => ({ ...l, id: `${prefix}-${l.id}` })),
  }));
  snap.columns = snap.columns.map((c) => ({
    ...c,
    id: `${prefix}-${c.id}`,
    boardId: `${prefix}-${c.boardId}`,
    cardIds: c.cardIds.map((x) => `${prefix}-${x}`),
  }));
  snap.cards = snap.cards.map((c) => ({
    ...c,
    id: `${prefix}-${c.id}`,
    boardId: `${prefix}-${c.boardId}`,
    columnId: `${prefix}-${c.columnId}`,
    title: 'پیگیری سفارش روناک',
    assignee: teamNames[0] ?? c.assignee,
    assigneeUserId,
    labelIds: c.labelIds.map((x) => `${prefix}-${x}`),
  }));
  snap.noteBoards = snap.noteBoards.map((nb) => ({
    ...nb,
    id: `${prefix}-${nb.id}`,
    name: 'یادداشت‌های روناک',
  }));
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);
  snap.notes = [
    {
      id: `${prefix}-note-1`,
      boardId: snap.noteBoards[0]?.id ?? `${prefix}-notes-default`,
      title: 'چک‌لیست UAT روناک',
      content: 'این یادداشت برای تست ماژول یادداشت‌ها است.',
      color: '#fef08a',
      starred: true,
      archived: false,
      deletedAt: null,
      checklist: [],
      fileAttachments: [],
      labelIds: [],
    },
  ];
  snap.dailyReports = [
    {
      id: `${prefix}-dr-1`,
      authorId: assigneeUserId ?? 'ronak-author',
      authorName: teamNames[0] ?? 'کاربر',
      date: today,
      title: 'گزارش روزانه روناک',
      body: 'تماس با مشتری و پیگیری سفارش.',
      status: 'submitted',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];
  snap.fieldVisits = [
    {
      id: `${prefix}-fv-1`,
      customerName: 'مشتری روناک',
      date: today,
      designerName: 'سارا روناکی',
      durationMinutes: 45,
      result: 'positive',
      hasDesigner: true,
      maleCompanionCount: 1,
      femaleCompanionCount: 0,
      notes: 'بازدید نمایشی',
      authorId: assigneeUserId ?? 'ronak-author',
      authorName: teamNames[0] ?? 'کاربر',
      createdAt: nowIso,
    },
  ];
  snap.projects = [
    {
      id: `${prefix}-proj-1`,
      name: 'پروژه نمایشی روناک',
      memberIds: projectMemberPersonIds,
      members: teamNames,
    },
  ];
  snap.activeBoardId = `${prefix}-${snap.boards[0]?.id ?? 'board-demo'}`;
  snap.activeNoteBoardId = `${prefix}-${snap.noteBoards[0]?.id ?? 'notes-default'}`;
  return snap;
}

function prefixCommsIds<T extends { id: string }>(items: T[], p: string): T[] {
  return items.map((x) => ({ ...x, id: `${p}-${x.id}` }));
}

async function seedRonakData(businessId: string, ownerId: string) {
  const { memberIds, teamNames } = await ensureFixtureTeamUsers(businessId, ownerId);
  const fixtureMemberId = memberIds.find((id) => id !== ownerId);

  for (const p of seedPeople) {
    const person = remapPerson(p);
    await prisma.person.create({
      data: {
        businessId,
        personId: person.id,
        data: person as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await savePeopleModule(businessId, {
    personCategories: seedPersonCategories,
    personGroups: seedPersonGroups,
    receipts: seedReceipts.map(remapMoneyDoc),
    payments: seedPayments.map(remapMoneyDoc),
    shareholders: seedShareholders.map((s) => ({ ...s, id: rid(s.id), personId: pid(s.personId) })),
    vendors: seedVendors.map((v) => ({ ...v, id: rid(v.id), personId: pid(v.personId) })),
  });

  await saveCatalogModule(businessId, {
    productCategories: seedProductCategories,
    priceLists: seedPriceLists,
  });

  for (const p of seedProducts) {
    const product: Product = { ...structuredClone(p), id: rid(p.id), code: `RON-${p.code}` };
    await prisma.catalogProduct.create({
      data: {
        businessId,
        productId: product.id,
        data: product as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const saleDate = new Date().toISOString().slice(0, 10);
  await saveCommerceModule(businessId, {
    saleInvoices: [
      {
        id: 'ronak-sal-001',
        customerId: pid('3'),
        date: saleDate,
        status: 'confirmed',
        total: 45_000_000,
        kind: 'sale',
      },
      {
        id: 'ronak-ret-001',
        customerId: pid('1'),
        date: saleDate,
        status: 'confirmed',
        total: 2_000_000,
        kind: 'return',
      },
    ],
    incomeTypes: ['فروش نقدی', 'خدمات'],
    incomeRows: [
      {
        id: 'ronak-inc-001',
        title: 'درآمد نمایشی روناک',
        type: 'فروش نقدی',
        amount: 12_000_000,
        date: saleDate,
      },
    ],
    installments: [],
    productDiscounts: [],
    purchaseInvoices: [
      {
        id: 'ronak-pur-001',
        kind: 'purchase',
        number: 'P-9001',
        reference: 'RONAK',
        date: saleDate,
        dueDate: saleDate,
        contactCode: pid('2'),
        contactTitle: 'تامین‌کننده روناک',
        project: 'پروژه UAT روناک',
        freight: 0,
        note: 'خرید نمایشی',
        status: 'confirmed',
        invoiceItems: [],
      },
    ],
    expenses: [
      {
        id: 'ronak-exp-001',
        dateTime: saleDate,
        description: 'هزینه حمل روناک',
        amount: 1_200_000,
        type: 'expense',
      },
    ],
    wastes: [],
  });

  await saveStoreModule(businessId, {
    products: [
      {
        id: 'ronak-store-1',
        name: 'مبل روناک ویترین',
        cat: 'مبلمان',
        price: '۴۵,۰۰۰,۰۰۰',
        stock: '3',
        seo: 'روناک',
        status: 'active',
      },
    ],
    orders: [],
    seo: { title: 'فروشگاه روناک', description: 'داده فیک UAT', keywords: 'روناک' },
    settings: { shopName: 'روناک استور', currency: 'تومان', shippingNote: 'ارسال تهران' },
  });

  await saveBlogModule(businessId, {
    posts: [
      {
        id: 'ronak-blog-1',
        title: 'راهنمای تست روناک',
        author: 'تیم QA',
        date: '1404/09/01',
        views: '12',
        status: 'منتشر شده',
        category: 'راهنمای خرید',
      },
    ],
    categories: [{ id: 'ronak-cat', name: 'راهنما', count: 1, slug: 'ronak-guide' }],
    comments: [],
    seo: { title: 'بلاگ روناک', description: '' },
  });

  await saveWarehouseModule(businessId, {
    vouchers: [
      {
        id: 'ronak-wv-1',
        number: '9001',
        date: saleDate,
        status: 'posted',
        description: 'حواله نمایشی روناک',
        type: 'issue',
        warehouseReceiptStatus: 'posted',
        sourceInvoiceNumber: 'ronak-sal-001',
        sourceWarehouseId: 'ronak-wh-main',
        destinationWarehouseId: 'ronak-wh-show',
        items: [
          {
            id: 'ronak-vi-1',
            itemCode: rid('1'),
            title: 'مبلمان روناک',
            requestedQty: 1,
            availableQty: 5,
            quantity: 1,
            unit: 'عدد',
          },
        ],
      },
    ],
    stocktakingSessions: [],
  });

  await saveProductionModule(businessId, {
    customerOrders: [
      {
        id: 'ronak-ord-1',
        customer: 'مشتری روناک',
        items: 'سفارش مبل',
        date: '1404/09/01',
        status: 'در حال تولید',
        progress: 35,
        type: 'new',
      },
    ],
    procurementRequests: [
      {
        id: 'ronak-pr-1',
        title: 'تهیه پارچه روناک',
        type: 'کالا',
        requester: teamNames[0] ?? 'کاربر',
        date: '1404/09/01',
        status: 'در انتظار تایید',
        priority: 'medium',
      },
    ],
    formulas: [],
    productionOrders: [],
    workOrders: [],
  });

  await createCrmLead(businessId, {
    name: 'علیرضا روناکی',
    source: 'سایت',
    interest: 'مبل راحتی',
    registeredDate: '۱۴۰۴/۰۹/۰۱',
    status: 'new',
  });

  await createCrmVisit(businessId, {
    customerName: 'خانم روناک',
    phone: '09120001122',
    source: 'ویترین',
    companions: 2,
    withDesigner: true,
    gender: 'female',
    buyProbability: 70,
    result: 'مثبت',
    designerName: 'سارا روناکی',
    durationMinutes: 45,
  });

  const stage = await prisma.crmPipelineStage.create({
    data: { businessId, title: 'مذاکره', sortOrder: 0, color: '#f59e0b' },
  });
  await prisma.crmOpportunity.create({
    data: {
      businessId,
      stageId: stage.id,
      title: 'فرصت فروش روناک',
      amount: 28_000_000,
      expectedClose: '1404/10/01',
      sortOrder: 0,
    },
  });

  await prisma.crmClubMember.create({
    data: {
      businessId,
      name: 'عضو باشگاه روناک',
      phone: '09123334455',
      level: 'طلایی',
      score: 420,
      lastVisit: 'امروز',
      status: 'active',
      source: 'روناک',
    },
  });

  const group = await prisma.phoneDirectoryGroup.create({
    data: { businessId, name: 'تیم روناک', slug: 'ronak-team', sortOrder: 0 },
  });
  await prisma.phoneDirectoryEntry.create({
    data: {
      businessId,
      groupId: group.id,
      entryKind: 'internal',
      displayName: teamNames[0] ?? 'کاربر روناک',
      firstName: 'سارا',
      lastName: 'روناکی',
      mobile: '09121110001',
      department: 'فروش',
      jobTitle: 'کارشناس',
      userId: fixtureMemberId ?? ownerId,
    },
  });

  const unit = await prisma.orgUnit.create({
    data: { businessId, name: 'واحد فروش روناک', sortOrder: 0 },
  });
  if (fixtureMemberId) {
    await prisma.orgAssignment.create({
      data: {
        businessId,
        unitId: unit.id,
        userId: fixtureMemberId,
        roleTitle: 'کارشناس فروش',
      },
    });
  }

  await prisma.hrRequestType.create({
    data: {
      businessId,
      slug: 'ronak-leave',
      labelFa: 'مرخصی (روناک تست)',
      kind: 'hr',
      formSchema: { fields: [{ key: 'days', label: 'تعداد روز', type: 'number' }] },
      enabled: true,
      sortOrder: 0,
    },
  });

  const ws = buildWorkspaceSnapshot(teamNames, {
    assigneeUserId: fixtureMemberId,
    projectMemberPersonIds: seedPeople.length > 0 ? [pid(seedPeople[0].id)] : [],
  });
  await saveWorkspaceSnapshotToDb(businessId, ws);

  const p = 'ronak';
  const letters = createMockLettersSnapshot();
  letters.letters = prefixCommsIds(letters.letters, p).map((l) => ({
    ...l,
    subject: 'نامه تست روناک',
    to: teamNames.slice(0, 1),
  }));
  await saveLettersSnapshotToDb(businessId, letters);

  const chat = createMockChatSnapshot();
  chat.threads = prefixCommsIds(chat.threads, p).map((t) => ({
    ...t,
    title: 'چت تیم روناک',
    participantNames: teamNames,
  }));
  chat.messages = chat.messages.map((m) => ({
    ...m,
    id: `${p}-${m.id}`,
    threadId: `${p}-${m.threadId}`,
    author: teamNames[0] ?? m.author,
    body: 'پیام نمایشی روناک برای UAT',
  }));
  await saveChatSnapshotToDb(businessId, chat);

  const cal = createMockCalendarSnapshot();
  cal.calendars = prefixCommsIds(cal.calendars, p).map((c) => ({
    ...c,
    name: 'تقویم روناک',
    ownerName: teamNames[0] ?? c.ownerName,
  }));
  cal.events = cal.events.map((e) => ({
    ...e,
    id: `${p}-${e.id}`,
    calendarId: `${p}-${e.calendarId}`,
    title: 'رویداد روناک',
  }));
  await saveCalendarSnapshotToDb(businessId, cal);

  const reqs = createMockRequestsSnapshot();
  reqs.requests = prefixCommsIds(reqs.requests, p).map((r) => ({
    ...r,
    subject: 'درخواست داخلی روناک',
    authorName: teamNames[0] ?? r.authorName,
    authorId: fixtureMemberId ?? ownerId,
  }));
  await saveRequestsSnapshotToDb(businessId, reqs);

  await prisma.catalogProduct.upsert({
    where: {
      businessId_productId: { businessId, productId: 'ronak-wh-item-1' },
    },
    create: {
      businessId,
      productId: 'ronak-wh-item-1',
      name: 'کالای انبار روناک',
      code: 'WH-RON-001',
      accountingCode: 'WH-RON-001',
      type: 'goods',
      status: 'active',
      data: {
        id: 'ronak-wh-item-1',
        name: 'کالای انبار روناک',
        code: 'WH-RON-001',
        status: 'active',
        type: 'goods',
      },
    },
    update: {},
  });
  const whItem = await prisma.warehouseItem.findFirst({
    where: { businessId, catalogProductId: 'ronak-wh-item-1', warehouseLocationId: null },
    select: { id: true },
  });
  if (whItem) {
    await prisma.warehouseItem.update({
      where: { id: whItem.id },
      data: { stockQty: 12, unit: 'عدد' },
    });
  } else {
    await prisma.warehouseItem.create({
      data: {
        businessId,
        catalogProductId: 'ronak-wh-item-1',
        stockQty: 12,
        unit: 'عدد',
      },
    });
  }
}

async function createFixtureBusiness() {
  const existing = await findActiveFixtureBusiness();
  if (existing) {
    console.error(`کسب‌وکار fixture «${FIXTURE_BUSINESS_NAME}» از قبل فعال است: ${existing.id}`);
    console.error('از --recreate استفاده کنید یا اول --destroy --confirm');
    process.exit(1);
  }

  const ownerId = await resolveOwnerId();
  if (dryRun) {
    console.log('dry-run --create: would create business', FIXTURE_BUSINESS_NAME, 'owner', ownerId);
    return;
  }

  const business = await prisma.business.create({
    data: {
      name: FIXTURE_BUSINESS_NAME,
      plan: 'active',
      creditLabel: FIXTURE_CREDIT_LABEL,
      expiresAt: defaultBusinessExpiry(),
      createdById: ownerId,
      members: { create: { userId: ownerId, role: 'owner', joinedAt: new Date() } },
      profile: {
        create: {
          tradeName: FIXTURE_BUSINESS_NAME,
          legalName: `شرکت نمونه ${FIXTURE_BUSINESS_NAME}`,
          email: 'ronam-fixture@local.test',
          phone: '02100000000',
        },
      },
      fiscalYears: { create: { ...DEFAULT_FISCAL_YEAR, isActive: true } },
      projects: {
        create: { name: `پروژه UAT ${FIXTURE_BUSINESS_NAME}`, isDefault: true, active: true },
      },
    },
  });

  await seedRonakData(business.id, ownerId);

  console.log('[fixture] created business id:', business.id);
  console.log('[fixture] name:', FIXTURE_BUSINESS_NAME, '| creditLabel:', FIXTURE_CREDIT_LABEL);
  console.log('[fixture] fixture users password:', FIXTURE_PASSWORD);
  console.log('[fixture] owner can switch business in UI — refresh /businesses');
}

async function destroyAllFixtures(opts: { force?: boolean } = {}) {
  const businesses = await listAllFixtureBusinesses();
  const fixtureUsers = await prisma.user.findMany({
    where: {
      OR: ALL_FIXTURE_USER_PREFIXES.map((prefix) => ({
        username: { startsWith: prefix },
      })),
    },
    select: { id: true, username: true },
  });

  if (!businesses.length && !fixtureUsers.length) {
    console.log('fixture یافت نشد — چیزی برای حذف نیست.');
    return;
  }

  const needConfirm = !opts.force && !dryRun;
  if (dryRun || (needConfirm && !confirm)) {
    console.log('Would delete businesses:', businesses.map((b) => `${b.name} [${b.status}] ${b.id}`).join('; ') || '(none)');
    console.log(
      'Would delete fixture users:',
      fixtureUsers.map((u) => u.username).join(', ') || '(none)'
    );
    if (needConfirm && !confirm) {
      console.error('برای حذف واقعی: --destroy --confirm (یا --recreate بدون تأیید جداگانه)');
      process.exit(1);
    }
    return;
  }

  for (const b of businesses) {
    await prisma.business.delete({ where: { id: b.id } });
    console.log('[fixture] destroyed business', b.id, b.name, `(${b.status})`);
  }
  if (fixtureUsers.length) {
    await prisma.user.deleteMany({ where: { id: { in: fixtureUsers.map((u) => u.id) } } });
    console.log('[fixture] removed users:', fixtureUsers.length);
  }
}

async function dryRunSummary() {
  const businesses = await listAllFixtureBusinesses();
  const active = businesses.find((b) => b.status === 'active' && b.creditLabel === FIXTURE_CREDIT_LABEL);
  const userCount = active
    ? await prisma.businessMember.count({ where: { businessId: active.id } })
    : 0;
  const people = active ? await prisma.person.count({ where: { businessId: active.id } }) : 0;
  const cards = active ? await prisma.workspaceCard.count({ where: { businessId: active.id } }) : 0;
  console.log(
    'fixture businesses:',
    businesses.length
      ? businesses.map((b) => `${b.name} [${b.status}] ${b.creditLabel ?? '—'}`).join(' | ')
      : '—'
  );
  console.log('active UAT members:', userCount, '| people:', people, '| workspace cards:', cards);
  console.log('fixture users:', (await fixtureUserIds()).length);
}

async function main() {
  if (dryRun && !create && !destroy && !recreate) {
    await dryRunSummary();
    return;
  }
  if (recreate) {
    if (dryRun) {
      await dryRunSummary();
      console.log('dry-run --recreate: would destroy all fixtures then create', FIXTURE_BUSINESS_NAME);
      return;
    }
    await destroyAllFixtures({ force: true });
    await createFixtureBusiness();
    return;
  }
  if (create) await createFixtureBusiness();
  else if (destroy) await destroyAllFixtures();
  else {
    console.log(`Usage:
  npm run db:tenant-ronak -- --create [--owner=admin]
  npm run db:tenant-ronak -- --recreate [--owner=admin]
  npm run db:tenant-ronak -- --dry-run
  npm run db:tenant-ronak -- --destroy --confirm`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());