'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  BusinessProfile,
  ExchangeRateRow,
  FiscalYearSettings,
  FormBuilderElement,
  FormBuilderKind,
  FormTemplate,
  NotificationRule,
  SettingsPicklist,
  SettingsPicklistItem,
  SettingsPicklistKind,
  SettingsProject,
} from '@/src/types/settings';
import { MEIZITO_VISIT_PRIORITY_TAG_LABELS } from '@/src/types/meizito';
import { SETTINGS_PICKLIST_KINDS } from '@/src/types/settings';
import { useBusinessOptional } from '@/src/context/BusinessContext';
import { parseApiJson } from '@/src/lib/http/parse-api-response';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now());
}

const defaultBusiness = (): BusinessProfile => ({
  legalName: '',
  tradeName: '',
  nationalId: '',
  economicCode: '',
  regNo: '',
  phone: '',
  fax: '',
  address: '',
  postalCode: '',
  city: '',
  website: '',
  email: '',
});

const defaultFiscal = (): FiscalYearSettings => ({
  label: 'سال مالی ۱۴۰۴',
  startDate: '1404/01/01',
  endDate: '1404/12/29',
});

function itemsFromPairs(pairs: [string, string][]): SettingsPicklistItem[] {
  return pairs.map(([id, label], order) => ({ id, label, active: true, order }));
}

function defaultForKind(kind: SettingsPicklistKind): SettingsPicklistItem[] {
  switch (kind) {
    case 'visit-priorities':
      return Object.entries(MEIZITO_VISIT_PRIORITY_TAG_LABELS).map(([id, label], order) => ({
        id,
        label,
        active: true,
        order,
      }));
    case 'customer-type':
      return itemsFromPairs([
        ['loyal', 'وفادار'],
        ['new', 'جدید'],
        ['return', 'بازدید مجدد'],
      ]);
    case 'acquaintance-source':
      return itemsFromPairs([
        ['loyal-customer', 'وفادار (مشتری قبلی)'],
        ['referral', 'معرفی دوستان'],
        ['instagram', 'اینستاگرام'],
        ['website', 'وب‌سایت'],
        ['in-person', 'حضوری'],
      ]);
    case 'contact-method':
      return itemsFromPairs([
        ['showroom', 'حضور در مجموعه'],
        ['phone', 'تماس تلفنی'],
        ['social', 'شبکه اجتماعی'],
      ]);
    case 'group-membership':
      return itemsFromPairs([
        ['vip', 'مشتریان ویژه'],
        ['regular', 'مشتریان'],
      ]);
    case 'product-interest-groups':
      return itemsFromPairs([
        ['general', 'عمومی'],
      ]);
    case 'purchase-probability-levels':
      return itemsFromPairs([
        ['p100', '۱۰۰٪ — قطعی'],
        ['p75', '۷۵٪ — احتمال زیاد'],
        ['p50', '۵۰٪ — متوسط'],
        ['p25', '۲۵٪ — کم'],
      ]);
    case 'estimated-sale-ranges':
      return itemsFromPairs([
        ['lt100', 'کمتر از ۱۰۰ میلیون'],
        ['100-500', '۱۰۰ تا ۵۰۰ میلیون'],
        ['gt500', 'بالای ۵۰۰ میلیون'],
      ]);
    default:
      return [];
  }
}

function emptyPicklists(): SettingsPicklist[] {
  return SETTINGS_PICKLIST_KINDS.map((kind) => ({
    kind,
    items: defaultForKind(kind),
  }));
}

type SettingsApiPayload = {
  exchangeRates: Array<{
    id: string;
    code: string;
    nameFa: string;
    rateToRial: number;
    effectiveAt: string;
    active: boolean;
  }>;
  formTemplates: Array<{
    id: string;
    module: string;
    name: string;
    fields: FormBuilderElement[];
    updatedAt: string;
  }>;
  notificationRules: Array<{
    id: string;
    eventKey: string;
    titleFa: string;
    inApp: boolean;
    sms: boolean;
    email: boolean;
    active: boolean;
  }>;
  picklistItems: Array<{
    id: string;
    groupKey: string;
    code: string;
    label: string;
    sortOrder: number;
    active: boolean;
  }>;
};

export interface SettingsContextValue {
  projects: SettingsProject[];
  upsertProject: (p: Omit<SettingsProject, 'id'> & { id?: string }) => void;
  removeProject: (id: string) => void;
  setDefaultProject: (id: string) => void;

  business: BusinessProfile;
  setBusiness: (p: Partial<BusinessProfile>) => void;

  fiscalYear: FiscalYearSettings;
  setFiscalYear: (p: Partial<FiscalYearSettings>) => void;

  exchangeRates: ExchangeRateRow[];
  upsertExchangeRate: (row: Omit<ExchangeRateRow, 'id'> & { id?: string }) => void;
  removeExchangeRate: (id: string) => void;

  formTemplates: FormTemplate[];
  saveFormTemplate: (name: string, formKind: FormBuilderKind, elements: FormBuilderElement[]) => void;
  removeFormTemplate: (id: string) => void;

  notificationRules: NotificationRule[];
  setNotificationRule: (id: string, patch: Partial<NotificationRule>) => void;

  picklists: SettingsPicklist[];
  getPicklist: (kind: SettingsPicklistKind, businessId?: string | null) => SettingsPicklistItem[];
  upsertPicklistItem: (
    kind: SettingsPicklistKind,
    item: Partial<SettingsPicklistItem> & { label?: string }
  ) => void;
  removePicklistItem: (kind: SettingsPicklistKind, id: string) => void;
  getVisitPriorityOptions: () => { id: string; label: string }[];
  getPicklistOptions: (kind: SettingsPicklistKind) => { id: string; label: string }[];
  getCustomerTypeOptions: () => { id: string; label: string }[];
  getAcquaintanceOptions: () => { id: string; label: string }[];
  getContactMethodOptions: () => { id: string; label: string }[];
  getGroupMembershipOptions: () => { id: string; label: string }[];
  getProductInterestOptions: () => { id: string; label: string }[];
  getPurchaseProbabilityLevelOptions: () => { id: string; label: string }[];
  getEstimatedSaleRangeOptions: () => { id: string; label: string }[];
  getPicklistLabel: (kind: SettingsPicklistKind, id: string | undefined) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const businessCtx = useBusinessOptional();
  const activeBusinessId = businessCtx?.activeBusinessId ?? null;

  const [projects, setProjects] = useState<SettingsProject[]>([]);
  const [business, setBusinessState] = useState<BusinessProfile>(() => defaultBusiness());
  const [fiscalYear, setFiscalYearState] = useState<FiscalYearSettings>(() => defaultFiscal());
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateRow[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [picklists, setPicklists] = useState<SettingsPicklist[]>(() => emptyPicklists());

  const loadFromServer = useCallback(async (businessId: string) => {
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(businessId)}/settings`, {
        credentials: 'include',
      });
      const data = await parseApiJson<SettingsApiPayload>(res);

      setExchangeRates(
        data.exchangeRates.map((r) => ({
          id: r.id,
          fromCurrency: r.code,
          toCurrency: 'IRR',
          rate: r.rateToRial,
          effectiveDate: r.effectiveAt,
        }))
      );

      setFormTemplates(
        data.formTemplates.map((t) => ({
          id: t.id,
          name: t.name,
          formKind: (t.module as FormBuilderKind) || 'contact',
          elements: Array.isArray(t.fields) ? t.fields : [],
          updatedAt: t.updatedAt,
        }))
      );

      setNotificationRules(
        data.notificationRules.map((n) => ({
          id: n.id,
          title: n.titleFa,
          description: n.eventKey,
          enabled: n.active,
          channel: n.sms ? 'sms' : n.email ? 'email' : 'in-app',
        }))
      );

      if (data.picklistItems.length > 0) {
        const grouped = new Map<string, SettingsPicklistItem[]>();
        for (const item of data.picklistItems) {
          const arr = grouped.get(item.groupKey) ?? [];
          arr.push({
            id: item.id,
            label: item.label,
            active: item.active,
            order: item.sortOrder,
          });
          grouped.set(item.groupKey, arr);
        }
        setPicklists(
          SETTINGS_PICKLIST_KINDS.map((kind) => ({
            kind,
            items: grouped.get(kind)?.length ? grouped.get(kind)! : defaultForKind(kind),
          }))
        );
      }
    } catch {
      // Keep clean default state when unauthenticated or loading
    }
  }, []);

  useEffect(() => {
    if (!activeBusinessId) return;
    void loadFromServer(activeBusinessId);
  }, [activeBusinessId, loadFromServer]);

  const upsertProject = useCallback((p: Omit<SettingsProject, 'id'> & { id?: string }) => {
    setProjects((prev) => {
      const id = p.id ?? newId();
      const row: SettingsProject = {
        id,
        name: p.name,
        isDefault: p.isDefault,
        active: p.active,
        businessId: p.businessId,
      };
      const others = prev.filter((x) => x.id !== id);
      const cleared = row.isDefault ? others.map((x) => ({ ...x, isDefault: false })) : others;
      return [row, ...cleared];
    });
  }, []);

  const removeProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const setDefaultProject = useCallback((id: string) => {
    setProjects((prev) => prev.map((x) => ({ ...x, isDefault: x.id === id })));
  }, []);

  const setBusiness = useCallback((patch: Partial<BusinessProfile>) => {
    setBusinessState((s) => ({ ...s, ...patch }));
  }, []);

  const setFiscalYear = useCallback((patch: Partial<FiscalYearSettings>) => {
    setFiscalYearState((s) => ({ ...s, ...patch }));
  }, []);

  const upsertExchangeRate = useCallback(
    (row: Omit<ExchangeRateRow, 'id'> & { id?: string }) => {
      if (activeBusinessId) {
        void fetch(`/api/businesses/${encodeURIComponent(activeBusinessId)}/settings`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'exchange_rate',
            code: row.fromCurrency,
            nameFa: row.fromCurrency,
            rateToRial: Number(row.rate) || 0,
            effectiveAt: row.effectiveDate,
          }),
        })
          .then(() => loadFromServer(activeBusinessId))
          .catch(() => undefined);
      }
      setExchangeRates((prev) => {
        const id = row.id ?? newId();
        const nextRow: ExchangeRateRow = {
          id,
          fromCurrency: row.fromCurrency,
          toCurrency: row.toCurrency,
          rate: row.rate,
          effectiveDate: row.effectiveDate,
        };
        const i = prev.findIndex((x) => x.id === id);
        if (i === -1) return [nextRow, ...prev];
        const cp = [...prev];
        cp[i] = nextRow;
        return cp;
      });
    },
    [activeBusinessId, loadFromServer]
  );

  const removeExchangeRate = useCallback(
    (id: string) => {
      if (activeBusinessId) {
        void fetch(`/api/businesses/${encodeURIComponent(activeBusinessId)}/settings`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'exchange_rate', id }),
        }).catch(() => undefined);
      }
      setExchangeRates((prev) => prev.filter((x) => x.id !== id));
    },
    [activeBusinessId]
  );

  const saveFormTemplate = useCallback(
    (name: string, formKind: FormBuilderKind, elements: FormBuilderElement[]) => {
      const cleanName = name.trim() || 'بدون عنوان';
      if (activeBusinessId) {
        void fetch(`/api/businesses/${encodeURIComponent(activeBusinessId)}/settings`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'form_template',
            module: formKind,
            name: cleanName,
            fields: elements,
          }),
        })
          .then(() => loadFromServer(activeBusinessId))
          .catch(() => undefined);
      }
      const t: FormTemplate = {
        id: newId(),
        name: cleanName,
        formKind,
        elements: elements.map((e) => ({ ...e })),
        updatedAt: new Date().toISOString(),
      };
      setFormTemplates((prev) => [t, ...prev]);
    },
    [activeBusinessId, loadFromServer]
  );

  const removeFormTemplate = useCallback(
    (id: string) => {
      if (activeBusinessId) {
        void fetch(`/api/businesses/${encodeURIComponent(activeBusinessId)}/settings`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'form_template', id }),
        }).catch(() => undefined);
      }
      setFormTemplates((prev) => prev.filter((x) => x.id !== id));
    },
    [activeBusinessId]
  );

  const setNotificationRule = useCallback(
    (id: string, patch: Partial<NotificationRule>) => {
      if (activeBusinessId) {
        void fetch(`/api/businesses/${encodeURIComponent(activeBusinessId)}/settings`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entity: 'notification_rule',
            id,
            data: {
              ...(patch.enabled !== undefined ? { active: patch.enabled } : {}),
              ...(patch.channel === 'sms' ? { sms: true, inApp: false, email: false } : {}),
              ...(patch.channel === 'email' ? { email: true, inApp: false, sms: false } : {}),
              ...(patch.channel === 'in-app' ? { inApp: true, sms: false, email: false } : {}),
            },
          }),
        }).catch(() => undefined);
      }
      setNotificationRules((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    },
    [activeBusinessId]
  );

  const getPicklist = useCallback(
    (kind: SettingsPicklistKind, businessId?: string | null) => {
      const list = picklists.find((p) => p.kind === kind);
      let items = [...(list?.items ?? [])];
      if (businessId) {
        const scoped = items.filter((i) => !i.businessId || i.businessId === businessId);
        if (scoped.length) items = scoped;
      }
      return items.sort((a, b) => a.order - b.order);
    },
    [picklists]
  );

  const upsertPicklistItem = useCallback(
    (kind: SettingsPicklistKind, item: Partial<SettingsPicklistItem> & { label?: string }) => {
      if (activeBusinessId) {
        void fetch(`/api/businesses/${encodeURIComponent(activeBusinessId)}/settings`, {
          method: item.id ? 'PATCH' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            item.id
              ? {
                  entity: 'picklist_item',
                  id: item.id,
                  data: {
                    ...(item.label !== undefined ? { label: item.label } : {}),
                    ...(item.active !== undefined ? { active: item.active } : {}),
                  },
                }
              : {
                  entity: 'picklist_item',
                  groupKey: kind,
                  label: item.label ?? 'گزینه جدید',
                  sortOrder: item.order ?? 0,
                  active: item.active ?? true,
                }
          ),
        })
          .then(() => loadFromServer(activeBusinessId))
          .catch(() => undefined);
      }
      setPicklists((prev) => {
        const list = prev.find((p) => p.kind === kind) ?? { kind, items: [] };
        const items = [...list.items];
        const id = item.id ?? newId();
        const i = items.findIndex((x) => x.id === id);
        const maxOrder = items.reduce((m, x) => Math.max(m, x.order), -1);
        const row: SettingsPicklistItem = {
          id,
          label: item.label ?? items[i]?.label ?? 'گزینه جدید',
          active: item.active ?? items[i]?.active ?? true,
          order: item.order ?? items[i]?.order ?? maxOrder + 1,
        };
        if (i === -1) items.push(row);
        else items[i] = { ...items[i], ...row };
        items.sort((a, b) => a.order - b.order);
        const others = prev.filter((p) => p.kind !== kind);
        return [...others, { kind, items }];
      });
    },
    [activeBusinessId, loadFromServer]
  );

  const removePicklistItem = useCallback(
    (kind: SettingsPicklistKind, id: string) => {
      if (activeBusinessId) {
        void fetch(`/api/businesses/${encodeURIComponent(activeBusinessId)}/settings`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'picklist_item', id }),
        }).catch(() => undefined);
      }
      setPicklists((prev) =>
        prev.map((p) =>
          p.kind === kind ? { ...p, items: p.items.filter((x) => x.id !== id) } : p
        )
      );
    },
    [activeBusinessId]
  );

  const getPicklistOptions = useCallback(
    (kind: SettingsPicklistKind) =>
      getPicklist(kind)
        .filter((x) => x.active)
        .map((x) => ({ id: x.id, label: x.label })),
    [getPicklist]
  );

  const getVisitPriorityOptions = useCallback(
    () => getPicklistOptions('visit-priorities'),
    [getPicklistOptions]
  );
  const getCustomerTypeOptions = useCallback(
    () => getPicklistOptions('customer-type'),
    [getPicklistOptions]
  );
  const getAcquaintanceOptions = useCallback(
    () => getPicklistOptions('acquaintance-source'),
    [getPicklistOptions]
  );
  const getContactMethodOptions = useCallback(
    () => getPicklistOptions('contact-method'),
    [getPicklistOptions]
  );
  const getGroupMembershipOptions = useCallback(
    () => getPicklistOptions('group-membership'),
    [getPicklistOptions]
  );
  const getProductInterestOptions = useCallback(
    () => getPicklistOptions('product-interest-groups'),
    [getPicklistOptions]
  );
  const getPurchaseProbabilityLevelOptions = useCallback(
    () => getPicklistOptions('purchase-probability-levels'),
    [getPicklistOptions]
  );
  const getEstimatedSaleRangeOptions = useCallback(
    () => getPicklistOptions('estimated-sale-ranges'),
    [getPicklistOptions]
  );

  const getPicklistLabel = useCallback(
    (kind: SettingsPicklistKind, id: string | undefined) => {
      if (!id) return '—';
      return getPicklist(kind).find((x) => x.id === id)?.label ?? id;
    },
    [getPicklist]
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      projects,
      upsertProject,
      removeProject,
      setDefaultProject,
      business,
      setBusiness,
      fiscalYear,
      setFiscalYear,
      exchangeRates,
      upsertExchangeRate,
      removeExchangeRate,
      formTemplates,
      saveFormTemplate,
      removeFormTemplate,
      notificationRules,
      setNotificationRule,
      picklists,
      getPicklist,
      upsertPicklistItem,
      removePicklistItem,
      getVisitPriorityOptions,
      getPicklistOptions,
      getCustomerTypeOptions,
      getAcquaintanceOptions,
      getContactMethodOptions,
      getGroupMembershipOptions,
      getProductInterestOptions,
      getPurchaseProbabilityLevelOptions,
      getEstimatedSaleRangeOptions,
      getPicklistLabel,
    }),
    [
      projects,
      upsertProject,
      removeProject,
      setDefaultProject,
      business,
      setBusiness,
      fiscalYear,
      setFiscalYear,
      exchangeRates,
      upsertExchangeRate,
      removeExchangeRate,
      formTemplates,
      saveFormTemplate,
      removeFormTemplate,
      notificationRules,
      setNotificationRule,
      picklists,
      getPicklist,
      upsertPicklistItem,
      removePicklistItem,
      getVisitPriorityOptions,
      getPicklistOptions,
      getCustomerTypeOptions,
      getAcquaintanceOptions,
      getContactMethodOptions,
      getGroupMembershipOptions,
      getProductInterestOptions,
      getPurchaseProbabilityLevelOptions,
      getEstimatedSaleRangeOptions,
      getPicklistLabel,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
