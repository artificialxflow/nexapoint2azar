'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, FolderOpen, Pencil, Phone, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { useMeizito } from '@/src/context/MeizitoContext';
import { FRONTEND_ONLY } from '@/src/lib/frontend-config';
import type { TeamDirectoryFilter } from '@/src/lib/meizito/approval';
import {
  createPhoneDirectoryEntryApi,
  createPhoneDirectoryGroupApi,
  deletePhoneDirectoryEntryApi,
  deletePhoneDirectoryGroupApi,
  fetchPhoneDirectory,
  fetchPhoneDirectoryGroups,
  updatePhoneDirectoryEntryApi,
  updatePhoneDirectoryGroupApi,
} from '@/src/lib/erp/phone-directory-client';
import {
  buildPhoneDirectorySections,
  splitPhoneTags,
  type PhoneDirectoryViewMode,
} from '@/src/lib/erp/phone-directory-views';
import { phoneEntryDisplayName } from '@/src/lib/erp/phone-display-name';
import { normalizeIranMobile } from '@/src/lib/auth/phone';
import type { PhoneDirectoryEntry, PhoneDirectoryGroup } from '@/src/types/phone-directory';

function normalizeTelHref(mobile: string): string | null {
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  let s = mobile.trim();
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(persian[i], String(i));
    s = s.replaceAll(arabic[i], String(i));
  }
  s = s.replace(/[^\d+]/g, '');
  return s.length >= 8 ? s : null;
}

export default function PhoneDirectoryPanel() {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId;
  const { listTeamDirectory } = useMeizito();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TeamDirectoryFilter>('all');
  const [groupFilterId, setGroupFilterId] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<PhoneDirectoryViewMode>('alpha');
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dbEntries, setDbEntries] = useState<PhoneDirectoryEntry[]>([]);
  const [groups, setGroups] = useState<PhoneDirectoryGroup[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [useDb, setUseDb] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [editing, setEditing] = useState<PhoneDirectoryEntry | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [form, setForm] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    mobile: '',
    landline: '',
    internalCode: '',
    address: '',
    visibilityTags: '',
    notes: '',
    extension: '',
    department: '',
    jobTitle: '',
    groupId: '',
  });
  const [saving, setSaving] = useState(false);
  const [groupSaving, setGroupSaving] = useState(false);

  const refreshDb = useCallback(async () => {
    if (FRONTEND_ONLY || !activeBusinessId) {
      setUseDb(false);
      setDbLoading(false);
      return;
    }
    setDbLoading(true);
    try {
      const [rows, groupRows] = await Promise.all([
        fetchPhoneDirectory(activeBusinessId, search),
        fetchPhoneDirectoryGroups(activeBusinessId),
      ]);
      setDbEntries(rows);
      setGroups(groupRows);
      setUseDb(true);
    } catch {
      setUseDb(false);
      setDbEntries([]);
      setGroups([]);
    } finally {
      setDbLoading(false);
    }
  }, [activeBusinessId, search]);

  useEffect(() => {
    void refreshDb();
  }, [refreshDb]);

  const mockList = useMemo(() => {
    if (!FRONTEND_ONLY) return [];
    return listTeamDirectory(filter, search);
  }, [listTeamDirectory, filter, search]);

  const groupNameById = useMemo(() => {
    const m = new Map<string, string>();
    groups.forEach((g) => m.set(g.id, g.name));
    return m;
  }, [groups]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    dbEntries.forEach((e) => (e.visibilityTags ?? []).forEach((t) => tagSet.add(t)));
    return [...tagSet].sort((a, b) => a.localeCompare(b, 'fa'));
  }, [dbEntries]);

  const dbFiltered = useMemo(() => {
    let list = dbEntries;
    if (groupFilterId !== 'all') {
      list = list.filter((e) => e.groupId === groupFilterId);
    }
    if (tagFilter !== 'all') {
      list = list.filter((e) => (e.visibilityTags ?? []).includes(tagFilter));
    }
    return list;
  }, [dbEntries, groupFilterId, tagFilter]);

  const displaySections = useMemo(
    () => buildPhoneDirectorySections(dbFiltered, viewMode, groupNameById),
    [dbFiltered, viewMode, groupNameById]
  );

  const copyNumber = async (num: string) => {
    const digits = num.replace(/\D/g, '');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(digits);
        setCopyNotice('شماره در کلیپ‌بورد کپی شد.');
      } else setCopyNotice('کپی در این مرورگر پشتیبانی نمی‌شود.');
    } catch {
      setCopyNotice('کپی ناموفق بود.');
    }
    window.setTimeout(() => setCopyNotice(null), 2500);
  };

  const cancelForm = () => {
    setFormError(null);
    setShowForm(false);
    setEditing(null);
    setForm({
      displayName: '',
      firstName: '',
      lastName: '',
      mobile: '',
      landline: '',
      internalCode: '',
      address: '',
      visibilityTags: '',
      notes: '',
      extension: '',
      department: '',
      jobTitle: '',
      groupId: '',
    });
  };

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
    setForm({
      displayName: '',
      firstName: '',
      lastName: '',
      mobile: '',
      landline: '',
      internalCode: '',
      address: '',
      visibilityTags: '',
      notes: '',
      extension: '',
      department: '',
      jobTitle: '',
      groupId: groupFilterId !== 'all' ? groupFilterId : '',
    });
  };

  const openEdit = (e: PhoneDirectoryEntry) => {
    setShowForm(true);
    setEditing(e);
    setForm({
      displayName: e.displayName,
      firstName: e.firstName ?? '',
      lastName: e.lastName ?? '',
      mobile: e.mobile,
      landline: e.landline ?? '',
      internalCode: e.internalCode ?? '',
      address: e.address ?? '',
      visibilityTags: (e.visibilityTags ?? []).join('، '),
      notes: e.notes ?? '',
      extension: e.extension,
      department: e.department,
      jobTitle: e.jobTitle,
      groupId: e.groupId ?? '',
    });
  };

  const saveEntry = async () => {
    const displayName =
      form.displayName.trim() ||
      [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
    if (!activeBusinessId || FRONTEND_ONLY || !displayName) return;

    setFormError(null);
    const mobileRaw = form.mobile.trim();
    let mobileNormalized: string | undefined;
    if (mobileRaw) {
      const normalized = normalizeIranMobile(mobileRaw);
      if (!normalized) {
        setFormError('شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود (مثال: ۰۹۱۲۱۲۳۴۵۶۷).');
        return;
      }
      mobileNormalized = normalized;
    }
    if (!editing && !form.groupId.trim()) {
      setFormError('انتخاب دسته برای مخاطب جدید الزامی است.');
      return;
    }
    if (!editing && !mobileNormalized) {
      setFormError('شماره موبایل معتبر برای مخاطب جدید الزامی است.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        displayName,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        mobile: mobileNormalized ?? editing?.mobile ?? '',
        landline: form.landline.trim() || undefined,
        internalCode: form.internalCode.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        extension: form.extension,
        department: form.department,
        jobTitle: form.jobTitle,
        entryKind: 'internal' as const,
        groupId: form.groupId || undefined,
        visibilityTags: splitPhoneTags(form.visibilityTags),
      };
      if (editing) {
        const updated = await updatePhoneDirectoryEntryApi(activeBusinessId, editing.id, payload);
        setDbEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await createPhoneDirectoryEntryApi(activeBusinessId, {
          ...payload,
          sortOrder: dbEntries.length,
        });
        setDbEntries((prev) => [...prev, created]);
      }
      cancelForm();
      setCopyNotice('مخاطب ذخیره شد.');
    } catch {
      setCopyNotice('ذخیره ناموفق بود.');
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = async (e: PhoneDirectoryEntry) => {
    if (!activeBusinessId || !window.confirm(`«${e.displayName}» حذف شود؟`)) return;
    try {
      await deletePhoneDirectoryEntryApi(activeBusinessId, e.id);
      setDbEntries((prev) => prev.filter((x) => x.id !== e.id));
    } catch {
      setCopyNotice('حذف ناموفق بود.');
    }
  };

  const addGroup = async () => {
    if (!activeBusinessId || !newGroupName.trim()) return;
    setGroupSaving(true);
    try {
      const g = await createPhoneDirectoryGroupApi(activeBusinessId, { name: newGroupName.trim() });
      setGroups((prev) => [...prev, g].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
      setNewGroupName('');
      setCopyNotice('دسته اضافه شد.');
    } catch {
      setCopyNotice('افزودن دسته ناموفق بود.');
    } finally {
      setGroupSaving(false);
    }
  };

  const saveGroupEdit = async (groupId: string) => {
    if (!activeBusinessId || !groupNameDraft.trim()) return;
    setGroupSaving(true);
    try {
      const g = await updatePhoneDirectoryGroupApi(activeBusinessId, groupId, {
        name: groupNameDraft.trim(),
      });
      setGroups((prev) => prev.map((x) => (x.id === g.id ? g : x)));
      setEditingGroupId(null);
      setCopyNotice('دسته به‌روز شد.');
    } catch {
      setCopyNotice('ویرایش دسته ناموفق بود.');
    } finally {
      setGroupSaving(false);
    }
  };

  const renderContactCard = (u: PhoneDirectoryEntry, rowKey: string) => {
    const tel = u.mobile ? normalizeTelHref(u.mobile) : null;
    const landlineTel = u.landline ? normalizeTelHref(u.landline) : null;
    const groupLabel = u.groupId ? groupNameById.get(u.groupId) : null;
    return (
      <li key={rowKey} className="nexa-card p-3 flex gap-3 items-start">
        <div className="w-9 h-9 rounded-full bg-nexa-accent/10 flex items-center justify-center shrink-0">
          <Users size={16} className="text-nexa-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">{phoneEntryDisplayName(u)}</p>
          <p className="text-[10px] text-gray-500">
            {[u.jobTitle, u.department].filter(Boolean).join(' · ') || '—'}
          </p>
          {groupLabel && (
            <p className="text-[9px] text-nexa-accent font-bold mt-0.5">دسته: {groupLabel}</p>
          )}
          {u.internalCode && (
            <p className="text-[10px] text-gray-500 font-fa-num mt-0.5">کد: {u.internalCode}</p>
          )}
          {u.mobile && <p className="text-xs text-gray-700 font-fa-num mt-1">موبایل: {u.mobile}</p>}
          {u.landline && (
            <p className="text-[10px] text-gray-600 font-fa-num">تلفن: {u.landline}</p>
          )}
          {u.extension && (
            <p className="text-[10px] text-gray-400 font-fa-num">داخلی: {u.extension}</p>
          )}
          {u.address && (
            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">آدرس: {u.address}</p>
          )}
          {u.notes && <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{u.notes}</p>}
          {(u.visibilityTags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {u.visibilityTags!.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTagFilter(tag)}
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-800"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-2 flex-wrap">
            {tel ? (
              <>
                <a
                  data-testid="meizito-phone-call"
                  href={`tel:${tel}`}
                  className="text-[10px] font-bold text-nexa-accent flex items-center gap-0.5"
                >
                  <Phone size={10} />
                  تماس
                </a>
                <button
                  type="button"
                  onClick={() => void copyNumber(tel)}
                  className="text-[10px] font-bold text-gray-500 flex items-center gap-0.5"
                >
                  <Copy size={10} />
                  کپی
                </button>
              </>
            ) : landlineTel ? (
              <>
                <a href={`tel:${landlineTel}`} className="text-[10px] font-bold text-nexa-accent flex items-center gap-0.5">
                  <Phone size={10} />
                  تماس ثابت
                </a>
                <button
                  type="button"
                  onClick={() => void copyNumber(landlineTel)}
                  className="text-[10px] font-bold text-gray-500 flex items-center gap-0.5"
                >
                  <Copy size={10} />
                  کپی
                </button>
              </>
            ) : (
              <span className="text-[10px] text-gray-400">شماره تماس ثبت نشده</span>
            )}
            <button type="button" onClick={() => openEdit(u)} className="text-[10px] font-bold text-gray-600">
              <Pencil size={10} className="inline" /> ویرایش
            </button>
            <button
              type="button"
              onClick={() => void removeEntry(u)}
              className="text-[10px] font-bold text-rose-600"
            >
              <Trash2 size={10} className="inline" /> حذف
            </button>
          </div>
        </div>
      </li>
    );
  };

  const removeGroup = async (g: PhoneDirectoryGroup) => {
    if (!activeBusinessId || !window.confirm(`دسته «${g.name}» حذف شود؟ مخاطبین بدون دسته می‌مانند.`)) return;
    setGroupSaving(true);
    try {
      await deletePhoneDirectoryGroupApi(activeBusinessId, g.id);
      setGroups((prev) => prev.filter((x) => x.id !== g.id));
      setDbEntries((prev) =>
        prev.map((e) => (e.groupId === g.id ? { ...e, groupId: undefined } : e))
      );
      if (groupFilterId === g.id) setGroupFilterId('all');
      setCopyNotice('دسته حذف شد.');
    } catch {
      setCopyNotice('حذف دسته ناموفق بود.');
    } finally {
      setGroupSaving(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Phone className="text-nexa-accent" size={22} />
          <div>
            <h3 className="text-sm font-black text-gray-900">دفتر تلفن</h3>
            <p className="text-[10px] text-gray-500">مخاطبین داخلی سازمان</p>
          </div>
        </div>
        {useDb && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowGroupManager((v) => !v)}
              className="text-xs font-bold text-gray-600 flex items-center gap-1 px-2 py-1 rounded-xl bg-gray-100"
            >
              <FolderOpen size={14} />
              دسته‌ها
            </button>
            <button type="button" onClick={openNew} className="text-xs font-bold text-nexa-accent flex items-center gap-1">
              <Plus size={14} /> مخاطب
            </button>
          </div>
        )}
      </div>

      {useDb && showGroupManager && (
        <div className="nexa-card p-3 space-y-2">
          <p className="text-[10px] font-bold text-gray-500">مدیریت دسته‌بندی</p>
          <div className="flex gap-2">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="نام دسته جدید"
              className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addGroup();
              }}
            />
            <button
              type="button"
              disabled={groupSaving}
              onClick={() => void addGroup()}
              className="text-xs font-bold text-nexa-accent px-3 py-1.5 rounded-lg bg-gray-50 disabled:opacity-60"
            >
              افزودن
            </button>
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {groups.length === 0 && (
              <li className="text-[10px] text-gray-400 py-2">هنوز دسته‌ای تعریف نشده.</li>
            )}
            {groups.map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-xs">
                {editingGroupId === g.id ? (
                  <>
                    <input
                      value={groupNameDraft}
                      onChange={(e) => setGroupNameDraft(e.target.value)}
                      className="flex-1 bg-gray-50 rounded-lg px-2 py-1"
                    />
                    <button
                      type="button"
                      disabled={groupSaving}
                      onClick={() => void saveGroupEdit(g.id)}
                      className="text-[10px] font-bold text-nexa-accent"
                    >
                      ذخیره
                    </button>
                    <button type="button" onClick={() => setEditingGroupId(null)} aria-label="انصراف">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-bold text-gray-800">{g.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroupId(g.id);
                        setGroupNameDraft(g.name);
                      }}
                      className="text-[10px] text-gray-600"
                    >
                      <Pencil size={12} className="inline" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeGroup(g)}
                      className="text-[10px] text-rose-600"
                    >
                      <Trash2 size={12} className="inline" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {useDb && showForm && (
        <div className="nexa-card p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              placeholder="نام"
              className="bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
            />
            <input
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="نام خانوادگی"
              className="bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
            />
          </div>
          <input
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            placeholder="نام نمایشی (اختیاری)"
            className="w-full bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
          />
          <input
            value={form.mobile}
            onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
            placeholder="موبایل"
            className="w-full bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-fa-num"
          />
          <input
            value={form.landline}
            onChange={(e) => setForm((f) => ({ ...f, landline: e.target.value }))}
            placeholder="تلفن ثابت"
            className="w-full bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-fa-num"
          />
          <input
            value={form.internalCode}
            onChange={(e) => setForm((f) => ({ ...f, internalCode: e.target.value }))}
            placeholder="کد مخاطب"
            className="w-full bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
          />
          <input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            placeholder="آدرس"
            className="w-full bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
          />
          <input
            value={form.visibilityTags}
            onChange={(e) => setForm((f) => ({ ...f, visibilityTags: e.target.value }))}
            placeholder="برچسب / نقش دسترسی (خالی = همه؛ با ویرگول)"
            className="w-full bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
          />
          <p className="text-[9px] text-gray-500 leading-relaxed">
            برچسب دسترسی: خالی = همهٔ اعضای کسب‌وکار می‌بینند؛ با برچسب (مثلاً فروش، داخلی) فقط نقش‌های
            مجاز در دفتر تلفن رکورد را می‌بینند — برای UAT با دو حساب تست کنید.
          </p>
          <input
            value={form.extension}
            onChange={(e) => setForm((f) => ({ ...f, extension: e.target.value }))}
            placeholder="داخلی"
            className="w-full bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
          />
          <input
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            placeholder="واحد (اختیاری)"
            className="w-full bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
          />
          <input
            value={form.jobTitle}
            onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
            placeholder="سمت"
            className="w-full bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
          />
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="توضیحات"
            rows={2}
            className="w-full bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
          />
          <label className="block text-[10px] font-bold text-gray-500">دسته</label>
          <select
            value={form.groupId}
            onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}
            className="w-full bg-gray-50 rounded-lg px-2 py-1.5 text-xs"
          >
            <option value="">بدون دسته</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {formError && (
            <p className="text-[10px] font-bold text-rose-600" role="alert">
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEntry()}
              className="flex-1 nexa-btn-primary py-2 text-xs disabled:opacity-60"
            >
              {saving ? 'ذخیره…' : editing ? 'به‌روزرسانی' : 'افزودن'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={cancelForm}
              className="flex-1 py-2 text-xs font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {copyNotice && (
        <p role="status" className="text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          {copyNotice}
        </p>
      )}

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        <input
          data-testid="meizito-phone-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو نام، واحد، موبایل…"
          className="w-full bg-gray-50 rounded-xl py-2 pr-9 pl-3 text-xs"
        />
      </div>

      {useDb && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[9px] font-bold text-gray-400 w-full sm:w-auto">نمایش:</span>
          {(
            [
              ['alpha', 'الفبا'],
              ['topic', 'موضوعی'],
              ['group', 'دسته‌ای'],
              ['tag', 'برچسبی'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-testid={`meizito-phone-view-${id}`}
              onClick={() => setViewMode(id)}
              className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${
                viewMode === id
                  ? 'bg-nexa-accent text-white border-nexa-accent'
                  : 'bg-white border-nexa-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {useDb && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[9px] font-bold text-gray-400 w-full sm:w-auto">فیلتر دسته:</span>
          <button
            type="button"
            onClick={() => setGroupFilterId('all')}
            className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${
              groupFilterId === 'all'
                ? 'bg-nexa-accent text-white border-nexa-accent'
                : 'bg-white border-nexa-border'
            }`}
          >
            همه
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupFilterId(g.id)}
              className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${
                groupFilterId === g.id
                  ? 'bg-nexa-accent text-white border-nexa-accent'
                  : 'bg-white border-nexa-border'
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {useDb && allTags.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[9px] font-bold text-gray-400 w-full sm:w-auto">فیلتر برچسب:</span>
          <button
            type="button"
            onClick={() => setTagFilter('all')}
            className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${
              tagFilter === 'all'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white border-nexa-border'
            }`}
          >
            همه
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tag)}
              className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${
                tagFilter === tag
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white border-nexa-border'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-2 max-h-[360px] overflow-y-auto">
        {dbLoading && !FRONTEND_ONLY ? (
          <p className="text-xs text-gray-400 text-center py-6">در حال بارگذاری…</p>
        ) : FRONTEND_ONLY ? (
          mockList.map((u) => {
            const tel = u.mobile ? normalizeTelHref(u.mobile) : null;
            return (
              <li key={u.id} className="nexa-card p-3 flex gap-3 items-start">
                <div className="w-9 h-9 rounded-full bg-nexa-accent/10 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-nexa-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{u.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {[u.jobTitle, u.department].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {u.mobile && <p className="text-xs text-gray-700 font-fa-num mt-1">{u.mobile}</p>}
                </div>
              </li>
            );
          })
        ) : useDb ? (
          displaySections.map((section) => (
            <React.Fragment key={section.key}>
              {section.title && (
                <li className="text-[10px] font-black text-gray-500 pt-2 sticky top-0 bg-gray-50/95 backdrop-blur px-1">
                  {section.title}
                </li>
              )}
              {section.entries.map((u) => renderContactCard(u, `${section.key}:${u.id}`))}
            </React.Fragment>
          ))
        ) : (
          <p className="text-xs text-gray-400 text-center py-6">بارگذاری دفتر تلفن ناموفق بود.</p>
        )}
        {!dbLoading && FRONTEND_ONLY && mockList.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">موردی یافت نشد.</p>
        )}
        {!dbLoading && !FRONTEND_ONLY && useDb && dbFiltered.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">موردی یافت نشد.</p>
        )}
      </ul>
    </div>
  );
}
