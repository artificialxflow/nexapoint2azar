import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  PERMISSION_CATALOG,
  type PermissionDef,
} from '@/src/lib/auth/permissions-catalog';

const prisma = new PrismaClient();

const ALL_PERMISSIONS = Object.fromEntries(
  PERMISSION_CATALOG.map((p: PermissionDef) => [p.key, true]),
);

const SYSTEM_ROLES = [
  {
    slug: 'super_admin',
    nameFa: 'مدیر سیستم',
    level: 100,
    permissions: ALL_PERMISSIONS,
  },
  {
    slug: 'manager',
    nameFa: 'مدیر کسب‌وکار',
    level: 80,
    permissions: {
      'sales:read': true,
      'sales:write': true,
      'crm:read': true,
      'finance:read': true,
      'finance:write': true,
      'inventory:read': true,
      'inventory:write': true,
      'reports:read': true,
      'users:read': true,
      'invites:read': true,
      'invites:write': true,
    },
  },
  {
    slug: 'sales',
    nameFa: 'کارشناس فروش',
    level: 40,
    permissions: {
      'sales:read': true,
      'sales:write': true,
      'crm:read': true,
      'reports:read': true,
    },
  },
  {
    slug: 'member',
    nameFa: 'کاربر عادی',
    level: 10,
    permissions: {},
  },
];

async function main() {
  // 1. Base system roles (idempotent)
  for (const role of SYSTEM_ROLES) {
    await prisma.systemRole.upsert({
      where: { slug: role.slug },
      create: {
        slug: role.slug,
        nameFa: role.nameFa,
        level: role.level,
        permissions: role.permissions,
        isSystem: true,
      },
      update: {
        nameFa: role.nameFa,
        level: role.level,
        permissions: role.permissions,
        isSystem: true,
      },
    });
  }

  const superAdminRole = await prisma.systemRole.findUniqueOrThrow({
    where: { slug: 'super_admin' },
  });

  // 2. Default system admin user (idempotent)
  const adminUsername = (process.env.SEED_ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const adminPhone = (process.env.SEED_ADMIN_PHONE || '09120000000').trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123456';
  const adminDisplayName = process.env.SEED_ADMIN_NAME || 'مدیر سیستم';

  const existingAdmin = await prisma.user.findUnique({ where: { username: adminUsername } });
  const adminUser = existingAdmin
    ? existingAdmin
    : await prisma.user.create({
        data: {
          username: adminUsername,
          mobilePhone: adminPhone,
          passwordHash: await bcrypt.hash(adminPassword, 10),
          displayName: adminDisplayName,
          status: 'active',
          mustChangePassword: false,
          systemRoleId: superAdminRole.id,
        },
      });

  // 3. One clean, empty default workspace (idempotent — zero fake operational records)
  const existingBusiness = await prisma.business.findFirst({
    where: { createdById: adminUser.id },
    orderBy: { createdAt: 'asc' },
  });

  if (!existingBusiness) {
    const business = await prisma.business.create({
      data: {
        name: 'کسب‌وکار اصلی',
        plan: 'active',
        creditLabel: 'نامحدود',
        defaultLocale: 'fa',
        status: 'active',
        createdById: adminUser.id,
        members: {
          create: {
            userId: adminUser.id,
            role: 'owner',
            joinedAt: new Date(),
          },
        },
        profile: {
          create: {
            legalName: 'کسب‌وکار اصلی',
            tradeName: 'کسب‌وکار اصلی',
          },
        },
        fiscalYears: {
          create: {
            label: 'سال مالی ۱۴۰۴',
            startDate: '1404/01/01',
            endDate: '1404/12/29',
            isActive: true,
          },
        },
        projects: {
          create: {
            name: 'پروژه پیش‌فرض',
            isDefault: true,
            active: true,
          },
        },
        catalogMeta: {
          create: {
            productCategories: [],
            priceLists: [{ id: 'pl-retail', code: 'RETAIL', name: 'نرخ پایه', isDefault: true }],
          },
        },
        peopleMeta: {
          create: {
            personCategories: [],
            personGroups: [],
          },
        },
        commerceMeta: {
          create: {
            incomeTypes: ['فروش کالا', 'ارائه خدمات'],
            installments: [],
            productDiscounts: [],
          },
        },
        storeSettings: {
          create: {
            shopName: 'فروشگاه نکسا',
            currency: 'تومان',
            isPublished: true,
          },
        },
        blogSettings: {
          create: {
            seoTitle: 'بلاگ نکساپوینت',
            isPublished: true,
          },
        },
      },
    });
    console.log(`Seeded clean default workspace: ${business.id}`);
  }

  console.log(`Seed completed cleanly (admin: ${adminUser.username}).`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
