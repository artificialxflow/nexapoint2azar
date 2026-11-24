import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';

const createSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('attendance'),
    employeeName: z.string().min(1),
    userId: z.string().optional().nullable(),
    workDate: z.string().min(1),
    checkIn: z.string().optional().default(''),
    checkOut: z.string().optional().default(''),
    workedMinutes: z.number().int().min(0).optional().default(0),
    overtimeMinutes: z.number().int().min(0).optional().default(0),
    status: z.enum(['present', 'absent', 'leave', 'remote', 'late']).optional().default('present'),
    note: z.string().optional().default(''),
  }),
  z.object({
    entity: z.literal('payroll'),
    employeeName: z.string().min(1),
    userId: z.string().optional().nullable(),
    periodLabel: z.string().min(1),
    baseSalary: z.number().min(0).default(0),
    overtimePay: z.number().min(0).optional().default(0),
    bonuses: z.number().min(0).optional().default(0),
    deductions: z.number().min(0).optional().default(0),
    status: z.string().optional().default('در انتظار پرداخت'),
  }),
  z.object({
    entity: z.literal('course'),
    title: z.string().min(1),
    instructor: z.string().optional().default(''),
    category: z.string().optional().default('عمومی'),
    durationHours: z.number().int().min(0).optional().default(0),
    startDate: z.string().optional().default(''),
    capacity: z.number().int().min(1).optional().default(20),
    status: z.string().optional().default('فعال'),
  }),
  z.object({
    entity: z.literal('enrollment'),
    courseId: z.string().min(1),
    participantName: z.string().min(1),
    progressPercent: z.number().int().min(0).max(100).optional().default(0),
  }),
]);

const patchSchema = z.object({
  entity: z.enum(['attendance', 'payroll', 'course']),
  id: z.string().min(1),
  status: z.string().optional(),
  checkOut: z.string().optional(),
});

const deleteSchema = z.object({
  entity: z.enum(['attendance', 'payroll', 'course']),
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);

    const [attendanceLogs, payrollSummaries, trainingCourses] = await Promise.all([
      prisma.attendanceLog.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.payrollPeriodSummary.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' }, take: 200 }),
      prisma.trainingCourse.findMany({
        where: { businessId },
        include: { enrollments: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return jsonOk({ attendanceLogs, payrollSummaries, trainingCourses });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.operations.get');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = createSchema.parse(await req.json());

    if (body.entity === 'attendance') {
      const created = await prisma.attendanceLog.create({
        data: {
          businessId,
          userId: body.userId ?? null,
          employeeName: body.employeeName,
          workDate: body.workDate,
          checkIn: body.checkIn,
          checkOut: body.checkOut,
          workedMinutes: body.workedMinutes,
          overtimeMinutes: body.overtimeMinutes,
          status: body.status,
          note: body.note,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    if (body.entity === 'payroll') {
      const netPay = body.baseSalary + body.overtimePay + body.bonuses - body.deductions;
      const created = await prisma.payrollPeriodSummary.create({
        data: {
          businessId,
          userId: body.userId ?? null,
          employeeName: body.employeeName,
          periodLabel: body.periodLabel,
          baseSalary: body.baseSalary,
          overtimePay: body.overtimePay,
          bonuses: body.bonuses,
          deductions: body.deductions,
          netPay,
          status: body.status,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    if (body.entity === 'course') {
      const created = await prisma.trainingCourse.create({
        data: {
          businessId,
          title: body.title,
          instructor: body.instructor,
          category: body.category,
          durationHours: body.durationHours,
          startDate: body.startDate,
          capacity: body.capacity,
          status: body.status,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    const course = await prisma.trainingCourse.findFirst({ where: { id: body.courseId, businessId } });
    if (!course) return jsonError('NOT_FOUND', 'دوره آموزشی یافت نشد.', 404);
    const created = await prisma.trainingEnrollment.create({
      data: {
        courseId: body.courseId,
        participantName: body.participantName,
        progressPercent: body.progressPercent,
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.operations.post');
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = patchSchema.parse(await req.json());

    if (body.entity === 'payroll') {
      const res = await prisma.payrollPeriodSummary.updateMany({
        where: { id: body.id, businessId },
        data: { ...(body.status ? { status: body.status } : {}) },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'رکورد حقوق یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    if (body.entity === 'course') {
      const res = await prisma.trainingCourse.updateMany({
        where: { id: body.id, businessId },
        data: { ...(body.status ? { status: body.status } : {}) },
      });
      if (res.count === 0) return jsonError('NOT_FOUND', 'دوره یافت نشد.', 404);
      return jsonOk({ updated: true });
    }

    const res = await prisma.attendanceLog.updateMany({
      where: { id: body.id, businessId },
      data: { ...(body.checkOut ? { checkOut: body.checkOut } : {}) },
    });
    if (res.count === 0) return jsonError('NOT_FOUND', 'تردد یافت نشد.', 404);
    return jsonOk({ updated: true });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.operations.patch');
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    await requireBusinessAccess(req, businessId);
    const body = deleteSchema.parse(await req.json());

    const map = {
      attendance: () => prisma.attendanceLog.deleteMany({ where: { id: body.id, businessId } }),
      payroll: () => prisma.payrollPeriodSummary.deleteMany({ where: { id: body.id, businessId } }),
      course: () => prisma.trainingCourse.deleteMany({ where: { id: body.id, businessId } }),
    };

    const res = await map[body.entity]();
    if (res.count === 0) return jsonError('NOT_FOUND', 'مورد یافت نشد.', 404);
    return jsonOk({ deleted: true });
  } catch (err) {
    return handleAuthRouteError(err, 'hr.operations.delete');
  }
}
