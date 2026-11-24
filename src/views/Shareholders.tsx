import React, { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { newId, useCatalog } from '@/src/context/CatalogContext';
import { pickUnusedPersonId } from '@/src/lib/erp/people-module-utils';

export default function Shareholders() {
  const [localHint, setLocalHint] = useState<string | null>(null);
  const {
    shareholders,
    people,
    addShareholder,
    replaceShareholder,
    removeShareholder,
    flushPeopleModuleSave,
    peopleModuleSaveError,
  } = useCatalog();

  const total = useMemo(
    () => shareholders.reduce((acc, row) => acc + row.percent, 0),
    [shareholders]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">سهامداران</h1>
        <p className="text-sm text-gray-500 mt-1">مدیریت ترکیب سهام و درصد مالکیت</p>
        {(peopleModuleSaveError || localHint) && (
          <p className="text-xs font-bold text-rose-600 mt-2">{peopleModuleSaveError || localHint}</p>
        )}
      </div>
      <div className="nexa-card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-emerald-700 font-fa-num">
            مجموع: {total.toLocaleString('fa-IR')}%
          </p>
          {total > 100 && (
            <p className="text-xs font-bold text-rose-600">
              مجموع سهام بیشتر از 100% است.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setLocalHint(null);
              if (people.length === 0) {
                setLocalHint('ابتدا در تب «اشخاص» حداقل یک شخص ثبت کنید.');
                return;
              }
              const used = shareholders.map((s) => s.personId);
              const personId = pickUnusedPersonId(people, used);
              if (!personId) {
                setLocalHint('شخص آزاد برای سهامدار وجود ندارد؛ همه اشخاص قبلاً اضافه شده‌اند.');
                return;
              }
              const row = { id: newId(), personId, percent: 0 };
              const next = [row, ...shareholders];
              addShareholder(row);
              void flushPeopleModuleSave({ shareholders: next });
            }}
            className="px-3 py-2 bg-gray-100 rounded-xl text-xs font-bold"
          >
            افزودن ردیف
          </button>
        </div>
        <div className="space-y-2">
          {shareholders.map((row) => (
            <div key={row.id} className="grid md:grid-cols-12 gap-2 items-center">
              <select
                value={row.personId}
                onChange={(e) => replaceShareholder({ ...row, personId: e.target.value })}
                className="md:col-span-8 bg-gray-50 rounded-xl px-3 py-2 text-sm"
              >
                {people
                  .filter(
                    (person) =>
                      person.id === row.personId ||
                      !shareholders.some((s) => s.id !== row.id && s.personId === person.id)
                  )
                  .map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName}
                    </option>
                  ))}
              </select>
              <input
                value={row.percent}
                onChange={(e) =>
                  replaceShareholder({
                    ...row,
                    percent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  })
                }
                className="md:col-span-3 bg-gray-50 rounded-xl px-3 py-2 text-sm font-fa-num"
              />
              <button
                type="button"
                onClick={() => {
                  const next = shareholders.filter((s) => s.id !== row.id);
                  removeShareholder(row.id);
                  void flushPeopleModuleSave({ shareholders: next });
                }}
                className="md:col-span-1 p-2 rounded-xl text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
