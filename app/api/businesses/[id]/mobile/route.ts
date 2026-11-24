import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/db/prisma';
import { handleAuthRouteError, jsonOk } from '@/src/lib/auth/api';
import { requireBusinessAccess } from '@/src/lib/business/access';

const checkInSchema = z.object({
  action: z.enum(['check_in', 'check_out']),
  note: z.string().optional().default(''),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    const { user } = await requireBusinessAccess(req, businessId);

    const todayKey = new Date().toISOString().slice(0, 10);

    const [tasks, orders, requests, todayAttendance, lettersCount, chatsCount] = await Promise.all([
      prisma.workspaceCard.findMany({
        where: { businessId },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { id: true, title: true, dueDate: true, starred: true, assignee: true, category: true },
      }),
      prisma.customerOrder.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, orderNo: true, customer: true, status: true, progress: true, date: true },
      }),
      prisma.procurementRequest.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, status: true, priority: true, date: true },
      }),
      prisma.attendanceLog.findFirst({
        where: { businessId, userId: user.id, workDate: todayKey },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.internalLetter.count({ where: { businessId } }),
      prisma.chatThread.count({ where: { businessId } }),
    ]);

    return jsonOk({
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.systemRole.nameFa,
      },
      todayAttendance,
      stats: {
        tasksCount: tasks.length,
        ordersCount: orders.length,
        requestsCount: requests.length,
        lettersCount,
        chatsCount,
      },
      tasks,
      orders,
      requests,
    });
  } catch (err) {
    return handleAuthRouteError(err, 'mobile.summary');
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: businessId } = await ctx.params;
    const { user } = await requireBusinessAccess(req, businessId);
    const body = checkInSchema.parse(await req.json());

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5);

    const existing = await prisma.attendanceLog.findFirst({
      where: { businessId, userId: user.id, workDate: todayKey },
      orderBy: { createdAt: 'desc' },
    });

    if (body.action === 'check_in') {
      if (existing) {
        const updated = await prisma.attendanceLog.update({
          where: { id: existing.id },
          data: { checkIn: existing.checkIn || timeStr, note: body.note || existing.note },
        });
        return jsonOk(updated);
      }
      const created = await prisma.attendanceLog.create({
        data: {
          businessId,
          userId: user.id,
          employeeName: user.displayName || user.username,
          workDate: todayKey,
          checkIn: timeStr,
          status: 'present',
          note: body.note,
        },
      });
      return jsonOk(created, { status: 201 });
    }

    if (existing) {
      const updated = await prisma.attendanceLog.update({
        where: { id: existing.id },
        data: { checkOut: timeStr, note: body.note || existing.note },
      });
      return jsonOk(updated);
    }

    const created = await prisma.attendanceLog.create({
      data: {
        businessId,
        userId: user.id,
        employeeName: user.displayName || user.username,
        workDate: todayKey,
        checkOut: timeStr,
        status: 'present',
        note: body.note,
      },
    });
    return jsonOk(created, { status: 201 });
  } catch (err) {
    return handleAuthRouteError(err, 'mobile.attendance');
  }
}
