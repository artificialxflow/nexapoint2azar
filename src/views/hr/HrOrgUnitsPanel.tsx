'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronDown, ChevronLeft, Plus, User } from 'lucide-react';
import type { MeizitoMockUser } from '@/src/types/meizito';

type OrgUnitRow = {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  phone?: string;
  email?: string;
  location?: string;
};

type Props = {
  businessId: string | null;
  canManage: boolean;
  employees: { id: string; name: string }[];
  teamMembers?: MeizitoMockUser[];
  onAssignUnit?: (userId: string, unitId: string) => Promise<void>;
};

function personnelRoots(members: MeizitoMockUser[]): MeizitoMockUser[] {
  const ids = new Set(members.map((m) => m.id));
  return members
    .filter((m) => !m.managerId || !ids.has(m.managerId))
    .sort((a, b) => a.name.localeCompare(b.name, 'fa'));
}

function personnelChildren(members: MeizitoMockUser[], managerId: string): MeizitoMockUser[] {
  return members
    .filter((m) => m.managerId === managerId)
    .sort((a, b) => a.name.localeCompare(b.name, 'fa'));
}

type PersonTreeNodeProps = {
  person: MeizitoMockUser;
  depth: number;
  members: MeizitoMockUser[];
};

function PersonTreeNode({ person, depth, members }: PersonTreeNodeProps) {
  const kids = personnelChildren(members, person.id);
  const [open, setOpen] = useState(true);
  const meta = [person.jobTitle, person.department].filter(Boolean).join(' · ');
  const contact = [
    person.mobile ? `موبایل: ${person.mobile}` : '',
    person.extension ? `داخلی: ${person.extension}` : '',
    person.email ? `ایمیل: ${person.email}` : '',
  ].filter(Boolean);

  return (
    <li className="list-none" data-testid="hr-person-tree-node">
      <div
        className="nexa-card p-3 border-s-4 border-s-emerald-300"
        style={{ marginInlineStart: depth * 16 }}
      >
        <div className="flex flex-wrap items-start gap-2">
          {kids.length > 0 ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="shrink-0 p-0.5 text-gray-500 hover:text-gray-800"
              aria-expanded={open}
              aria-label={open ? 'جمع کردن زیردستان' : 'باز کردن زیردستان'}
            >
              {open ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
            </button>
          ) : (
            <span className="w-5 shrink-0" aria-hidden />
          )}
          <User className="text-emerald-600 shrink-0 mt-0.5" size={16} />
          <div className="flex-1 min-w-[8rem]">
            <p className="text-sm font-black text-gray-900">{person.name}</p>
            {meta ? <p className="text-[10px] text-gray-500 mt-0.5">{meta}</p> : null}
            {contact.length > 0 ? (
              <p className="text-[10px] text-gray-600 mt-1 font-fa-num leading-relaxed">
                {contact.join(' · ')}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {open && kids.length > 0 ? (
        <ul className="space-y-1 mt-1 ms-2 border-s border-dashed border-emerald-100">
          {kids.map((child) => (
            <PersonTreeNode key={child.id} person={child} depth={depth + 1} members={members} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function childrenOf(units: OrgUnitRow[], parentId: string | null): OrgUnitRow[] {
  return units
    .filter((u) => (u.parentId ?? null) === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'fa'));
}

type OrgTreeNodeProps = {
  unit: OrgUnitRow;
  depth: number;
  units: OrgUnitRow[];
  canManage: boolean;
  onPatchParent: (unitId: string, parentId: string | null) => void;
};

function OrgTreeNode({ unit, depth, units, canManage, onPatchParent }: OrgTreeNodeProps) {
  const kids = childrenOf(units, unit.id);
  const [open, setOpen] = useState(true);

  return (
  <li className="list-none" data-testid="hr-org-tree-node">
    <div
      className="nexa-card p-3 flex flex-wrap items-center gap-2 border-s-4 border-s-indigo-300 relative"
      style={{ marginInlineStart: depth * 16 }}
    >
      {depth > 0 && (
        <span
          className="absolute top-0 bottom-0 w-px bg-indigo-200"
          style={{ insetInlineStart: -10 }}
          aria-hidden
        />
      )}
      {kids.length > 0 ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 p-0.5 text-gray-500 hover:text-gray-800"
          aria-expanded={open}
          aria-label={open ? 'جمع کردن زیرمجموعه' : 'باز کردن زیرمجموعه'}
        >
          {open ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
        </button>
      ) : (
        <span className="w-5 shrink-0" aria-hidden />
      )}
      <Building2 className="text-indigo-500 shrink-0" size={16} />
      <span className="text-sm font-black text-gray-900 flex-1 min-w-[6rem]">{unit.name}</span>
      {(unit.phone || unit.email || unit.location) && (
        <p className="w-full text-[9px] text-gray-500 font-fa-num">
          {[unit.phone, unit.email, unit.location].filter(Boolean).join(' · ')}
        </p>
      )}
      {canManage && (
        <select
          value={unit.parentId ?? ''}
          onChange={(e) => {
            const pid = e.target.value || null;
            if (pid === unit.id) return;
            onPatchParent(unit.id, pid);
          }}
          className="bg-gray-50 rounded-lg px-2 py-1 text-[10px] max-w-[10rem]"
          aria-label="واحد والد"
        >
          <option value="">بدون والد (ریشه)</option>
          {units
            .filter((u) => u.id !== unit.id)
            .map((u) => (
              <option key={u.id} value={u.id}>
                والد: {u.name}
              </option>
            ))}
        </select>
      )}
    </div>
    {open && kids.length > 0 && (
      <ul className="space-y-1 mt-1 border-s border-dashed border-indigo-100 ms-2">
        {kids.map((child) => (
          <OrgTreeNode
            key={child.id}
            unit={child}
            depth={depth + 1}
            units={units}
            canManage={canManage}
            onPatchParent={onPatchParent}
          />
        ))}
      </ul>
    )}
  </li>
);
}

export default function HrOrgUnitsPanel({
  businessId,
  canManage,
  employees,
  teamMembers = [],
  onAssignUnit,
}: Props) {
  const [units, setUnits] = useState<OrgUnitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [unitDraft, setUnitDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  const rootUnits = useMemo(() => childrenOf(units, null), [units]);
  const personnelRootsList = useMemo(() => personnelRoots(teamMembers), [teamMembers]);

  const reload = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/org-units`, {
        credentials: 'include',
      });
      if (!res.ok) return;
      const json = (await res.json()) as { data?: { units?: OrgUnitRow[] } };
      setUnits(json.data?.units ?? []);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addUnit = async () => {
    if (!businessId || !newName.trim()) return;
    setMsg('');
    const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/org-units`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        parentId: newParentId || null,
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
        location: newLocation.trim() || undefined,
      }),
    });
    if (!res.ok) {
      setMsg('افزودن واحد ناموفق بود.');
      return;
    }
    setNewName('');
    setNewParentId('');
    setNewPhone('');
    setNewEmail('');
    setNewLocation('');
    await reload();
  };

  const patchParent = async (unitId: string, parentId: string | null) => {
    if (!businessId) return;
    setMsg('');
    const res = await fetch(
      `/api/businesses/${encodeURIComponent(businessId)}/org-units/${encodeURIComponent(unitId)}`,
      {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId }),
      }
    );
    if (!res.ok) {
      setMsg('به‌روزرسانی ساختار ناموفق بود.');
      return;
    }
    await reload();
    setMsg('ساختار واحد ذخیره شد.');
  };

  const saveUnitForUser = async (userId: string) => {
    const unitId = unitDraft[userId];
    if (!unitId || !onAssignUnit) return;
    await onAssignUnit(userId, unitId);
    setMsg('واحد پرسنل ذخیره شد.');
  };

  if (!businessId) {
    return (
      <p className="text-xs text-gray-500">کسب‌وکار فعال انتخاب کنید تا چارت سازمانی بارگذاری شود.</p>
    );
  }

  return (
    <div className="space-y-4" data-testid="hr-org-units">
      <div>
        <h3 className="text-sm font-black text-gray-900">چارت سازمانی (درختی)</h3>
        <p className="text-[10px] text-gray-500 mt-1">
          واحدها در نامه، درخواست و گزارش روز برای ارجاع استفاده می‌شوند.
        </p>
        <Link
          href="/dashboard/tasks?tab=reports&section=daily"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-nexa-accent mt-2 hover:underline"
        >
          گزارش روزانه تیم
          <ChevronLeft size={12} />
        </Link>
      </div>
      {loading && <p className="text-[10px] text-gray-400">در حال بارگذاری واحدها…</p>}
      <ul className="space-y-1" role="tree" aria-label="چارت سازمانی">
        {rootUnits.map((unit) => (
          <OrgTreeNode
            key={unit.id}
            unit={unit}
            depth={0}
            units={units}
            canManage={canManage}
            onPatchParent={(unitId, parentId) => void patchParent(unitId, parentId)}
          />
        ))}
      </ul>

      {personnelRootsList.length > 0 && (
        <div data-testid="hr-personnel-hierarchy">
          <h4 className="text-xs font-black text-gray-800 mt-6 mb-2">سلسله‌مراتب پرسنل (مدیر مستقیم)</h4>
          <p className="text-[10px] text-gray-500 mb-2">
            شماره تماس، ایمیل و واحد از team-directory — برای گردش تأیید HR و گزارش روز.
          </p>
          <ul className="space-y-1" role="tree" aria-label="سلسله‌مراتب پرسنل">
            {personnelRootsList.map((person) => (
              <PersonTreeNode key={person.id} person={person} depth={0} members={teamMembers} />
            ))}
          </ul>
        </div>
      )}

      {canManage && (
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="واحد جدید"
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs min-w-[10rem]"
          />
          <select
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs"
          >
            <option value="">ریشه (بدون والد)</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                زیرمجموعهٔ {u.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void addUnit()}
            className="text-xs font-bold text-nexa-accent flex items-center gap-1"
          >
            <Plus size={14} />
            واحد
          </button>
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="تلفن واحد (اختیاری)"
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs font-fa-num min-w-[8rem]"
          />
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="ایمیل (اختیاری)"
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs min-w-[8rem]"
          />
          <input
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="موقعیت / مکان (اختیاری)"
            className="bg-gray-50 rounded-xl px-3 py-2 text-xs min-w-[8rem]"
          />
        </div>
      )}

      {onAssignUnit && employees.length > 0 && (
        <div className="nexa-card p-4 space-y-2">
          <p className="text-xs font-bold text-gray-700">انتساب پرسنل به واحد (ارجاع نامه/درخواست)</p>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {employees.slice(0, 12).map((emp) => (
              <li key={emp.id} className="flex gap-2 items-center text-[10px]">
                <span className="flex-1 font-bold truncate">{emp.name}</span>
                <select
                  value={unitDraft[emp.id] ?? ''}
                  onChange={(e) => setUnitDraft((p) => ({ ...p, [emp.id]: e.target.value }))}
                  className="bg-gray-50 rounded-lg px-2 py-1"
                >
                  <option value="">واحد</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void saveUnitForUser(emp.id)}
                  className="font-bold text-emerald-700"
                >
                  ذخیره
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {msg && <p className="text-[10px] text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{msg}</p>}
    </div>
  );
}