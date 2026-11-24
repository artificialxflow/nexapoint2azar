'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Settings,
  X,
  RefreshCw,
} from 'lucide-react';
import { useMeizito } from '@/src/context/MeizitoContext';
import {
  buildJalaliMonthGrid,
  buildJalaliWeekGrid,
  buildJalaliYearOptions,
  CalendarViewMode,
  formatDateKeyJalaliHint,
  formatJalaliMonthYear,
  formatJalaliMonthYearA11y,
  formatSelectedDateJalali,
  parseDateKey,
  shiftJalaaliMonth,
  shiftWeekAnchor,
  toDateKey,
  toJalaaliParts,
  WEEKDAY_LABELS_FA,
  CALENDAR_KIND_LABELS,
  JALALI_MONTHS_FA,
  DEFAULT_JALALI_YEAR_MIN,
  DEFAULT_JALALI_YEAR_MAX,
} from '@/src/lib/meizito/calendarGrid';
import { getJalaliHolidayOnDate } from '@/src/lib/meizito/jalaliHolidays';
import { shiftDateKeyWithAnchor } from '@/src/lib/meizito/calendar-drag';
import JalaliDateInput from '@/src/views/meizito/components/JalaliDateInput';
import type {
  MeizitoCalendar,
  MeizitoCalendarEvent,
  MeizitoCalendarKind,
  MeizitoEventRecurrence,
  MeizitoTabId,
} from '@/src/types/meizito';
import { MEIZITO_ALL_CALENDARS_ID, MEIZITO_TASKS_CALENDAR_ID } from '@/src/types/meizito';

const CALENDAR_COLORS = ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#8b5cf6', '#ec4899'];

const RECURRENCE_LABELS: Record<MeizitoEventRecurrence, string> = {
  none: 'بدون تکرار',
  daily: 'روزانه',
  weekly: 'هفتگی',
  monthly: 'ماهانه',
  yearly: 'سالانه',
};

const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'بدون یادآوری' },
  { value: 15, label: '۱۵ دقیقه قبل' },
  { value: 30, label: '۳۰ دقیقه قبل' },
  { value: 60, label: '۱ ساعت قبل' },
  { value: 1440, label: '۱ روز قبل' },
];

const VIEW_LABELS: Record<CalendarViewMode, string> = {
  month: 'ماه',
  week: 'هفته',
  day: 'روز',
};

const WEEK_TIMELINE_HOUR_START = 6;
const WEEK_TIMELINE_HOUR_END = 22;

function eventStartHour(ev: MeizitoCalendarEvent): number | null {
  if (ev.allDay || !ev.time) return null;
  const [h] = ev.time.split(':').map((x) => Number(x));
  return Number.isFinite(h) ? h : null;
}

type Props = { onGoTab: (id: MeizitoTabId) => void };

function isDerivedEvent(id: string) {
  return id.startsWith('derived-card-') || id.startsWith('sync-');
}

function rsvpLabel(status: string | undefined) {
  if (status === 'accepted') return 'پذیرفته';
  if (status === 'declined') return 'رد شده';
  return 'در انتظار';
}

export default function CalendarPanel({ onGoTab }: Props) {
  const {
    calendars,
    calendarEvents,
    activeCalendarId,
    setActiveCalendarId,
    addCalendar,
    updateCalendar,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    getCalendarEventsForDate,
    syncEventsFromCards,
    cards,
    currentUserName,
    currentUserId,
    getCardsDueOn,
    getOverdueCards,
    mockUsers,
    listTeamDirectory,
    setEventRsvp,
  } = useMeizito();

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const todayJ = useMemo(() => toJalaaliParts(today), [today]);
  const yearOptions = useMemo(() => buildJalaliYearOptions(), []);

  const [viewJy, setViewJy] = useState(todayJ.jy);
  const [viewJm, setViewJm] = useState(todayJ.jm);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [calendarView, setCalendarView] = useState<CalendarViewMode>('month');

  const [showNewCalendar, setShowNewCalendar] = useState(false);
  const [newCalName, setNewCalName] = useState('');
  const [newCalKind, setNewCalKind] = useState<MeizitoCalendarKind>('custom');
  const [newCalColor, setNewCalColor] = useState(CALENDAR_COLORS[0]);

  const [showCalSettings, setShowCalSettings] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsColor, setSettingsColor] = useState(CALENDAR_COLORS[0]);
  const [settingsShareIds, setSettingsShareIds] = useState<string[]>([]);
  const [settingsVisible, setSettingsVisible] = useState(true);

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MeizitoCalendarEvent | null>(null);
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDate, setEvtDate] = useState(todayKey);
  const [evtTime, setEvtTime] = useState('');
  const [evtEndTime, setEvtEndTime] = useState('');
  const [evtEndDate, setEvtEndDate] = useState('');
  const [evtAllDay, setEvtAllDay] = useState(false);
  const [evtRecurrence, setEvtRecurrence] = useState<MeizitoEventRecurrence>('none');
  const [evtRecurrenceUntil, setEvtRecurrenceUntil] = useState('');
  const [evtReminderMinutes, setEvtReminderMinutes] = useState<number>(0);
  const [evtAttendeeIds, setEvtAttendeeIds] = useState<string[]>([]);
  const [evtNotes, setEvtNotes] = useState('');

  const activeCalendar = useMemo(() => {
    if (activeCalendarId === MEIZITO_ALL_CALENDARS_ID) {
      return {
        id: MEIZITO_ALL_CALENDARS_ID,
        name: 'همه تقویم‌ها',
        color: '#64748b',
        kind: 'general' as MeizitoCalendarKind,
        sharedWith: [] as string[],
        ownerName: currentUserName,
        visible: true,
      };
    }
    return calendars.find((c) => c.id === activeCalendarId) ?? calendars[0];
  }, [calendars, activeCalendarId, currentUserName]);

  const shareCandidates = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of mockUsers) map.set(u.id, u.name);
    for (const u of listTeamDirectory('all')) {
      if (!map.has(u.id)) map.set(u.id, u.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [mockUsers, listTeamDirectory]);

  const attendeeNameById = useMemo(() => {
    const m = new Map(shareCandidates.map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? id;
  }, [shareCandidates]);

  const monthCells = useMemo(() => buildJalaliMonthGrid(viewJy, viewJm), [viewJy, viewJm]);
  const weekCells = useMemo(() => buildJalaliWeekGrid(selectedDateKey), [selectedDateKey]);

  const selectedEvents = useMemo(
    () => getCalendarEventsForDate(activeCalendarId, selectedDateKey),
    [activeCalendarId, selectedDateKey, getCalendarEventsForDate, calendarEvents, cards]
  );

  const sidebarStats = useMemo(() => {
    const myToday = getCardsDueOn(todayKey).filter((c) => c.assignee === currentUserName).length;
    const overdue = getOverdueCards(todayKey).length;
    const others = cards.filter(
      (c) => c.assignee && c.assignee !== currentUserName && c.dueDate
    ).length;
    return { myToday, overdue, others };
  }, [cards, currentUserName, getCardsDueOn, getOverdueCards, todayKey]);

  const colorForEvent = (ev: MeizitoCalendarEvent) =>
    calendars.find((c) => c.id === ev.calendarId)?.color ?? activeCalendar?.color ?? '#6366f1';

  const resolveCalendarIdForNewEvent = () => {
    if (activeCalendarId === MEIZITO_ALL_CALENDARS_ID) {
      return (
        calendars.find((c) => c.visible !== false && c.id !== MEIZITO_TASKS_CALENDAR_ID)?.id ??
        calendars[0]?.id
      );
    }
    return activeCalendar?.id ?? activeCalendarId;
  };

  const syncViewFromDateKey = (dateKey: string) => {
    const j = toJalaaliParts(parseDateKey(dateKey));
    setViewJy(j.jy);
    setViewJm(j.jm);
  };

  const shiftMonth = (delta: number) => {
    const next = shiftJalaaliMonth(viewJy, viewJm, delta);
    setViewJy(next.jy);
    setViewJm(next.jm);
  };

  const shiftWeek = (delta: number) => {
    const nextKey = shiftWeekAnchor(selectedDateKey, delta);
    setSelectedDateKey(nextKey);
    syncViewFromDateKey(nextKey);
  };

  const shiftDay = (delta: number) => {
    const d = parseDateKey(selectedDateKey);
    d.setDate(d.getDate() + delta);
    const key = toDateKey(d);
    setSelectedDateKey(key);
    syncViewFromDateKey(key);
  };

  const goToday = () => {
    const j = toJalaaliParts(today);
    setViewJy(j.jy);
    setViewJm(j.jm);
    setSelectedDateKey(todayKey);
  };

  const openCalSettings = () => {
    if (!activeCalendar || activeCalendar.id === MEIZITO_ALL_CALENDARS_ID) return;
    setSettingsName(activeCalendar.name);
    setSettingsColor(activeCalendar.color);
    setSettingsShareIds(activeCalendar.sharedWith ?? []);
    setSettingsVisible(activeCalendar.visible !== false);
    setShowCalSettings(true);
  };

  const saveCalSettings = () => {
    if (!activeCalendar || activeCalendar.id === MEIZITO_ALL_CALENDARS_ID) return;
    const name = settingsName.trim();
    const patch: Partial<MeizitoCalendar> = {
      color: settingsColor,
      sharedWith: settingsShareIds,
      visible: settingsVisible,
    };
    if (name) patch.name = name;
    updateCalendar(activeCalendar.id, patch);
    setShowCalSettings(false);
  };

  const resetEventForm = (dateKey: string) => {
    setEditingEvent(null);
    setEvtTitle('');
    setEvtDate(dateKey);
    setEvtTime('');
    setEvtEndTime('');
    setEvtEndDate('');
    setEvtAllDay(false);
    setEvtRecurrence('none');
    setEvtRecurrenceUntil('');
    setEvtReminderMinutes(0);
    setEvtAttendeeIds([]);
    setEvtNotes('');
  };

  const openNewEvent = (dateKey?: string) => {
    resetEventForm(dateKey ?? selectedDateKey);
    setShowEventModal(true);
  };

  const openEditEvent = (evt: MeizitoCalendarEvent) => {
    if (isDerivedEvent(evt.id)) return;
    setEditingEvent(evt);
    setEvtTitle(evt.title);
    setEvtDate(evt.date);
    setEvtTime(evt.time ?? '');
    setEvtEndTime(evt.endTime ?? '');
    setEvtEndDate(evt.endDate ?? '');
    setEvtAllDay(evt.allDay === true);
    setEvtRecurrence(evt.recurrence ?? 'none');
    setEvtRecurrenceUntil(evt.recurrenceUntil ?? '');
    setEvtReminderMinutes(evt.reminderMinutes ?? 0);
    setEvtAttendeeIds(evt.attendeeIds ?? []);
    setEvtNotes(evt.notes ?? '');
    setShowEventModal(true);
  };

  const saveEvent = () => {
    const title = evtTitle.trim();
    if (!title) return;
    const calId = resolveCalendarIdForNewEvent();
    if (!calId) return;
    const payload = {
      calendarId: calId,
      title,
      date: evtDate,
      time: evtAllDay ? undefined : evtTime.trim() || undefined,
      endTime: evtAllDay ? undefined : evtEndTime.trim() || undefined,
      endDate:
        evtEndDate.trim() && evtEndDate.trim() !== evtDate ? evtEndDate.trim() : undefined,
      allDay: evtAllDay ? true : undefined,
      recurrence: evtRecurrence === 'none' ? undefined : evtRecurrence,
      recurrenceUntil:
        evtRecurrence !== 'none' && evtRecurrenceUntil ? evtRecurrenceUntil : undefined,
      reminderMinutes: evtReminderMinutes > 0 ? evtReminderMinutes : undefined,
      attendeeIds: evtAttendeeIds.length ? evtAttendeeIds : undefined,
      notes: evtNotes.trim() || undefined,
    };
    if (editingEvent) {
      updateCalendarEvent(editingEvent.id, payload);
    } else {
      addCalendarEvent(payload);
    }
    setShowEventModal(false);
  };

  const copyEvent = (ev: MeizitoCalendarEvent) => {
    if (isDerivedEvent(ev.id)) return;
    addCalendarEvent({
      calendarId: ev.calendarId,
      title: `${ev.title} (کپی)`,
      date: ev.date,
      time: ev.time,
      endTime: ev.endTime,
      endDate: ev.endDate,
      allDay: ev.allDay,
      recurrence: ev.recurrence,
      recurrenceUntil: ev.recurrenceUntil,
      notes: ev.notes,
      reminderMinutes: ev.reminderMinutes,
      attendeeIds: ev.attendeeIds ? [...ev.attendeeIds] : undefined,
    });
  };

  const submitNewCalendar = () => {
    if (!newCalName.trim()) return;
    addCalendar(newCalName, newCalKind, newCalColor);
    setShowNewCalendar(false);
    setNewCalName('');
    setNewCalKind('custom');
  };

  const onMonthYearChange = (jm: number, jy: number) => {
    setViewJm(jm);
    setViewJy(jy);
  };

  const moveEventToDate = (eventId: string, newDateKey: string) => {
    const ev = calendarEvents.find((e) => e.id === eventId);
    if (!ev || isDerivedEvent(ev.id)) return;
    const patch: Partial<MeizitoCalendarEvent> = { date: newDateKey };
    if (ev.endDate && ev.endDate !== ev.date) {
      patch.endDate = shiftDateKeyWithAnchor(ev.endDate, ev.date, newDateKey);
    }
    updateCalendarEvent(eventId, patch);
  };

  const handleEventDrop = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/meizito-event');
    if (id) moveEventToDate(id, dateKey);
  };

  const renderWeekEvent = (ev: MeizitoCalendarEvent) => {
    const derived = isDerivedEvent(ev.id);
    return (
      <div
        key={ev.id}
        role="button"
        tabIndex={0}
        draggable={!derived}
        onDragStart={(e) => {
          if (derived) return;
          e.stopPropagation();
          e.dataTransfer.setData('text/meizito-event', ev.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onClick={() => openEditEvent(ev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') openEditEvent(ev);
        }}
        className={`w-full text-right rounded-lg px-1 py-0.5 text-white ${
          derived ? 'opacity-60 cursor-default' : 'cursor-grab active:cursor-grabbing'
        }`}
        style={{ backgroundColor: colorForEvent(ev) }}
      >
        <p className="text-[8px] font-bold truncate">{ev.title}</p>
        <p className="text-[7px] opacity-90 font-fa-num">
          {ev.allDay ? 'تمام‌روز' : [ev.time, ev.endTime].filter(Boolean).join('–') || '—'}
        </p>
      </div>
    );
  };

  const renderEventChips = (events: MeizitoCalendarEvent[], limit = 3) => (
    <ul className="space-y-0.5">
      {events.slice(0, limit).map((ev) => (
        <li
          key={ev.id}
          draggable={!isDerivedEvent(ev.id)}
          onDragStart={(e) => {
            if (isDerivedEvent(ev.id)) return;
            e.stopPropagation();
            e.dataTransfer.setData('text/meizito-event', ev.id);
            e.dataTransfer.effectAllowed = 'move';
          }}
          className="text-[8px] sm:text-[9px] font-bold truncate rounded px-0.5 text-white cursor-grab active:cursor-grabbing"
          style={{ backgroundColor: colorForEvent(ev) }}
        >
          {ev.title}
        </li>
      ))}
      {events.length > limit && (
        <li className="text-[8px] text-gray-400">+{events.length - limit}</li>
      )}
    </ul>
  );

  const renderGridCell = (cell: { dateKey: string; inMonth?: boolean; jalaliDay: number }) => {
    const events = getCalendarEventsForDate(activeCalendarId, cell.dateKey);
    const isToday = cell.dateKey === todayKey;
    const isSelected = cell.dateKey === selectedDateKey;
    const holiday = getJalaliHolidayOnDate(cell.dateKey);
    const inMonth = cell.inMonth !== false;
    return (
      <div
        key={cell.dateKey}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setSelectedDateKey(cell.dateKey);
            syncViewFromDateKey(cell.dateKey);
          }
        }}
        onClick={() => {
          setSelectedDateKey(cell.dateKey);
          syncViewFromDateKey(cell.dateKey);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => handleEventDrop(e, cell.dateKey)}
        className={`min-h-[72px] sm:min-h-[88px] p-1 rounded-xl border text-right transition-colors cursor-pointer ${
          !inMonth ? 'opacity-40 bg-gray-50/50' : 'bg-white'
        } ${isSelected ? 'ring-2 ring-nexa-accent border-nexa-accent' : 'border-gray-100'} ${
          isToday ? 'bg-nexa-accent/5' : ''
        } ${holiday ? 'bg-rose-50/40' : ''}`}
      >
        <span
          className={`text-sm font-bold block mb-0.5 font-fa-num ${
            isToday ? 'text-nexa-accent' : 'text-gray-900'
          }`}
        >
          {cell.jalaliDay.toLocaleString('fa-IR')}
        </span>
        {holiday && (
          <p className="text-[7px] text-rose-700 font-bold truncate mb-0.5">{holiday.title}</p>
        )}
        {renderEventChips(events)}
      </div>
    );
  };

  const navPrimary = () => {
    if (calendarView === 'month') {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-base font-black text-gray-900 min-w-[7rem]" aria-hidden="true">
            {formatJalaliMonthYear(viewJy, viewJm)}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="p-2 rounded-xl bg-gray-100"
            aria-label="ماه قبل"
          >
            <ChevronRight size={18} />
          </button>
          <select
            value={viewJm}
            onChange={(e) => onMonthYearChange(Number(e.target.value), viewJy)}
            className="text-sm font-bold text-gray-900 bg-gray-50 rounded-xl px-2 py-1.5"
            aria-label="انتخاب ماه"
          >
            {JALALI_MONTHS_FA.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={viewJy}
            onChange={(e) => onMonthYearChange(viewJm, Number(e.target.value))}
            className="text-sm font-black text-gray-900 bg-gray-50 rounded-xl px-2 py-1.5 font-fa-num min-w-[5rem]"
            aria-label="انتخاب سال"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y.toLocaleString('fa-IR', { useGrouping: false })}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="p-2 rounded-xl bg-gray-100"
            aria-label="ماه بعد"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="sr-only">{formatJalaliMonthYearA11y(viewJy, viewJm)}</span>
        </div>
      );
    }
    if (calendarView === 'week') {
      const first = weekCells[0];
      const last = weekCells[6];
      const label =
        first && last
          ? `${formatSelectedDateJalali(first.dateKey)} — ${formatSelectedDateJalali(last.dateKey)}`
          : '';
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="p-2 rounded-xl bg-gray-100"
            aria-label="هفته قبل"
          >
            <ChevronRight size={18} />
          </button>
          <p className="text-xs sm:text-sm font-black text-gray-900 font-fa-num">{label}</p>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="p-2 rounded-xl bg-gray-100"
            aria-label="هفته بعد"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => shiftDay(-1)}
          className="p-2 rounded-xl bg-gray-100"
          aria-label="روز قبل"
        >
          <ChevronRight size={18} />
        </button>
        <p className="text-sm font-black text-gray-900 font-fa-num">
          {formatSelectedDateJalali(selectedDateKey)}
        </p>
        <button
          type="button"
          onClick={() => shiftDay(1)}
          className="p-2 rounded-xl bg-gray-100"
          aria-label="روز بعد"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
    );
  };

  const dayTimeline = useMemo(() => {
    const sorted = [...selectedEvents].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
    return sorted;
  }, [selectedEvents]);

  const weekTimelineHours = useMemo(
    () =>
      Array.from(
        { length: WEEK_TIMELINE_HOUR_END - WEEK_TIMELINE_HOUR_START + 1 },
        (_, i) => WEEK_TIMELINE_HOUR_START + i
      ),
    []
  );

  const weekDayBuckets = useMemo(() => {
    return weekCells.map((cell, weekDayIndex) => {
      const events = getCalendarEventsForDate(activeCalendarId, cell.dateKey);
      const allDay = events.filter((ev) => ev.allDay || (!ev.time && !ev.endTime));
      const timed = events.filter((ev) => !ev.allDay && (ev.time || ev.endTime));
      return { cell, weekDayIndex, allDay, timed };
    });
  }, [weekCells, activeCalendarId, getCalendarEventsForDate, calendarEvents, cards]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <aside className="lg:w-44 shrink-0 space-y-2">
          <p className="text-[10px] font-bold text-gray-500">خلاصه وظایف</p>
          <div className="nexa-card p-3 space-y-2 text-xs">
            <p>
              <span className="font-bold text-nexa-accent">{sidebarStats.myToday}</span> کار من امروز
            </p>
            <p>
              <span className="font-bold text-rose-600">{sidebarStats.overdue}</span> معوق
            </p>
            <p>
              <span className="font-bold text-gray-600">{sidebarStats.others}</span> پیگیری از دیگران
            </p>
          </div>
          {activeCalendarId === MEIZITO_TASKS_CALENDAR_ID && (
            <button
              type="button"
              onClick={syncEventsFromCards}
              className="w-full text-[10px] font-bold flex items-center justify-center gap-1 py-2 rounded-xl bg-gray-100"
            >
              <RefreshCw size={12} />
              همگام‌سازی کارت‌ها
            </button>
          )}
        </aside>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCalendarId(MEIZITO_ALL_CALENDARS_ID)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${
                activeCalendarId === MEIZITO_ALL_CALENDARS_ID
                  ? 'bg-white shadow-sm border-gray-200'
                  : 'border-transparent bg-gray-50 text-gray-600'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-400 to-indigo-500" />
              همه
            </button>
            {calendars.filter((cal) => cal.visible !== false).map((cal) => (
              <button
                key={cal.id}
                type="button"
                onClick={() => setActiveCalendarId(cal.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${
                  cal.id === activeCalendarId
                    ? 'bg-white shadow-sm border-gray-200'
                    : 'border-transparent bg-gray-50 text-gray-600'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: cal.color }}
                />
                {cal.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowNewCalendar(true)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100"
            >
              <Plus size={14} />
              تقویم جدید
            </button>
            <button
              type="button"
              onClick={openCalSettings}
              disabled={!activeCalendar || activeCalendar.id === MEIZITO_ALL_CALENDARS_ID}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 disabled:opacity-50"
            >
              <Settings size={14} />
              تنظیمات تقویم
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {navPrimary()}
            <div className="flex items-center gap-2">
              <div
                className="flex rounded-xl bg-gray-100 p-0.5 text-[10px] font-bold"
                role="tablist"
                aria-label="نمای تقویم"
              >
                {(Object.keys(VIEW_LABELS) as CalendarViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={calendarView === mode}
                    onClick={() => setCalendarView(mode)}
                    className={`px-3 py-1.5 rounded-lg ${
                      calendarView === mode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {VIEW_LABELS[mode]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={goToday}
                className="text-xs font-bold text-nexa-accent px-3 py-1.5 rounded-xl bg-nexa-accent/10"
              >
                امروز
              </button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-1 px-1">
            <div className="min-w-[320px]">
              {calendarView === 'month' && (
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAY_LABELS_FA.map((label) => (
                    <div key={label} className="text-center text-[10px] font-bold text-gray-500 py-1">
                      {label}
                    </div>
                  ))}
                </div>
              )}

              {calendarView === 'month' && (
                <div className="grid grid-cols-7 gap-1">{monthCells.map(renderGridCell)}</div>
              )}

              {calendarView === 'week' && (
                <div className="nexa-card overflow-hidden min-w-[640px]">
                  <div
                    className="grid border-b border-gray-100"
                    style={{ gridTemplateColumns: '3.25rem repeat(7, minmax(0, 1fr))' }}
                  >
                    <div className="p-1" />
                    {weekDayBuckets.map(({ cell, weekDayIndex }) => {
                      const isToday = cell.dateKey === todayKey;
                      const isSelected = cell.dateKey === selectedDateKey;
                      const holiday = getJalaliHolidayOnDate(cell.dateKey);
                      return (
                        <button
                          key={cell.dateKey}
                          type="button"
                          onClick={() => {
                            setSelectedDateKey(cell.dateKey);
                            syncViewFromDateKey(cell.dateKey);
                          }}
                          className={`p-2 text-center border-l border-gray-100 ${
                            isSelected ? 'bg-nexa-accent/10' : isToday ? 'bg-nexa-accent/5' : 'bg-white'
                          }`}
                        >
                          <p className="text-[9px] font-bold text-gray-500">
                            {WEEKDAY_LABELS_FA[weekDayIndex]}
                          </p>
                          <p
                            className={`text-sm font-black font-fa-num ${
                              isToday ? 'text-nexa-accent' : 'text-gray-900'
                            }`}
                          >
                            {cell.jalaliDay.toLocaleString('fa-IR')}
                          </p>
                          {holiday && (
                            <p className="text-[7px] text-rose-700 font-bold truncate">{holiday.title}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div
                    className="grid border-b border-gray-100 bg-gray-50/80"
                    style={{ gridTemplateColumns: '3.25rem repeat(7, minmax(0, 1fr))' }}
                  >
                    <div className="text-[8px] font-bold text-gray-500 p-1 flex items-center justify-center">
                      تمام‌روز
                    </div>
                    {weekDayBuckets.map(({ cell, allDay }) => (
                      <div
                        key={`allday-${cell.dateKey}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => handleEventDrop(e, cell.dateKey)}
                        className="min-h-[2.25rem] border-l border-gray-100 p-0.5 space-y-0.5"
                      >
                        {allDay.map((ev) => (
                          <div key={ev.id}>{renderWeekEvent(ev)}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="max-h-[min(58vh,480px)] overflow-y-auto">
                    {weekTimelineHours.map((hour) => (
                      <div
                        key={hour}
                        className="grid border-b border-gray-50"
                        style={{ gridTemplateColumns: '3.25rem repeat(7, minmax(0, 1fr))' }}
                      >
                        <div className="text-[9px] font-bold text-gray-400 font-fa-num p-1 pt-2">
                          {`${hour.toString().padStart(2, '0')}:00`}
                        </div>
                        {weekDayBuckets.map(({ cell, timed }) => {
                          const slotEvents = timed.filter((ev) => {
                            const start = eventStartHour(ev);
                            if (start === null) return hour === WEEK_TIMELINE_HOUR_START;
                            return start === hour;
                          });
                          return (
                            <div
                              key={`${cell.dateKey}-${hour}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(e) => handleEventDrop(e, cell.dateKey)}
                              className="min-h-[2.5rem] border-l border-gray-100 p-0.5 relative"
                            >
                              {slotEvents.map((ev) => (
                                <div key={ev.id}>{renderWeekEvent(ev)}</div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {calendarView === 'day' && (
                <div
                  className="nexa-card p-4 space-y-3"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => handleEventDrop(e, selectedDateKey)}
                >
                  {getJalaliHolidayOnDate(selectedDateKey) && (
                    <p className="text-xs font-bold text-rose-700 bg-rose-50 rounded-xl px-3 py-2">
                      تعطیل: {getJalaliHolidayOnDate(selectedDateKey)?.title}
                    </p>
                  )}
                  {dayTimeline.length === 0 ? (
                    <p className="text-sm text-gray-400">رویدادی برای این روز نیست.</p>
                  ) : (
                    <ul className="space-y-2">
                      {dayTimeline.map((ev) => (
                        <li
                          key={ev.id}
                          draggable={!isDerivedEvent(ev.id)}
                          onDragStart={(e) => {
                            if (isDerivedEvent(ev.id)) return;
                            e.dataTransfer.setData('text/meizito-event', ev.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          className={`flex gap-3 border-r-4 rounded-xl bg-gray-50 p-3 ${
                            isDerivedEvent(ev.id) ? '' : 'cursor-grab active:cursor-grabbing'
                          }`}
                          style={{ borderColor: colorForEvent(ev) }}
                        >
                          <div className="text-[10px] font-bold text-gray-500 min-w-[4.5rem] font-fa-num">
                            {ev.time ?? '—'}
                            {ev.endTime ? ` – ${ev.endTime}` : ''}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900">{ev.title}</p>
                            {ev.notes && (
                              <p className="text-[10px] text-gray-500 mt-0.5">{ev.notes}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="lg:w-56 shrink-0">
          <div className="nexa-card p-4 space-y-3 sticky top-4">
            <p className="text-xs font-black text-gray-900 flex items-center gap-2">
              <Calendar size={14} />
              {formatSelectedDateJalali(selectedDateKey)}
            </p>
            <button
              type="button"
              onClick={() => openNewEvent(selectedDateKey)}
              className="w-full nexa-btn-primary py-2 text-xs font-bold"
              disabled={activeCalendarId === MEIZITO_ALL_CALENDARS_ID && calendars.length === 0}
            >
              + رویداد جدید
            </button>
            {selectedEvents.length === 0 ? (
              <p className="text-xs text-gray-400">رویدادی نیست.</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {selectedEvents.map((ev) => (
                  <li
                    key={ev.id}
                    className="text-xs border border-gray-100 rounded-xl p-2 space-y-1"
                    style={{ borderRightWidth: 3, borderRightColor: colorForEvent(ev) }}
                  >
                    <p className="font-bold text-gray-900">{ev.title}</p>
                    {(ev.time || ev.endTime) && (
                      <p className="text-[10px] text-gray-500 font-fa-num">
                        {ev.time ?? '—'}
                        {ev.endTime ? ` – ${ev.endTime}` : ''}
                      </p>
                    )}
                    {ev.recurrence && ev.recurrence !== 'none' && (
                      <p className="text-[10px] text-indigo-600">
                        {RECURRENCE_LABELS[ev.recurrence]}
                      </p>
                    )}
                    {ev.attendeeIds && ev.attendeeIds.length > 0 && (
                      <p className="text-[10px] text-gray-500">
                        دعوت: {ev.attendeeIds.map(attendeeNameById).join('، ')}
                      </p>
                    )}
                    {ev.attendeeIds?.includes(currentUserId) && !isDerivedEvent(ev.id) && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <span className="text-[9px] text-gray-400 w-full">
                          RSVP: {rsvpLabel(ev.rsvp?.[currentUserId])}
                        </span>
                        <button
                          type="button"
                          className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700"
                          onClick={() => setEventRsvp(ev.id, currentUserId, 'accepted')}
                        >
                          می‌آیم
                        </button>
                        <button
                          type="button"
                          className="text-[9px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700"
                          onClick={() => setEventRsvp(ev.id, currentUserId, 'declined')}
                        >
                          نمی‌آیم
                        </button>
                      </div>
                    )}
                    {ev.sourceCardId && (
                      <button
                        type="button"
                        className="text-[10px] font-bold text-nexa-accent"
                        onClick={() => onGoTab('boards')}
                      >
                        مشاهده کارت
                      </button>
                    )}
                    {!isDerivedEvent(ev.id) && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          className="text-[10px] font-bold text-gray-600"
                          onClick={() => openEditEvent(ev)}
                        >
                          ویرایش
                        </button>
                        <button
                          type="button"
                          className="text-[10px] font-bold text-gray-600 inline-flex items-center gap-0.5"
                          onClick={() => copyEvent(ev)}
                        >
                          <Copy size={10} />
                          کپی
                        </button>
                        <button
                          type="button"
                          className="text-[10px] font-bold text-rose-600"
                          onClick={() => deleteCalendarEvent(ev.id)}
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {showNewCalendar && (
        <Modal title="تقویم جدید" onClose={() => setShowNewCalendar(false)}>
          <input
            value={newCalName}
            onChange={(e) => setNewCalName(e.target.value)}
            placeholder="نام تقویم"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-3"
          />
          <select
            value={newCalKind}
            onChange={(e) => setNewCalKind(e.target.value as MeizitoCalendarKind)}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-3"
          >
            {(Object.keys(CALENDAR_KIND_LABELS) as MeizitoCalendarKind[]).map((k) => (
              <option key={k} value={k}>
                {CALENDAR_KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <div className="flex gap-2 flex-wrap mb-4">
            {CALENDAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewCalColor(c)}
                className={`w-8 h-8 rounded-full border-2 ${
                  newCalColor === c ? 'border-gray-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button type="button" onClick={submitNewCalendar} className="nexa-btn-primary w-full py-2 text-sm font-bold">
            ایجاد
          </button>
        </Modal>
      )}

      {showCalSettings && activeCalendar && activeCalendar.id !== MEIZITO_ALL_CALENDARS_ID && (
        <Modal title="تنظیمات تقویم" onClose={() => setShowCalSettings(false)}>
          <label className="block text-[10px] font-bold text-gray-500 mb-1">نام</label>
          <input
            value={settingsName}
            onChange={(e) => setSettingsName(e.target.value)}
            disabled={activeCalendar.id === MEIZITO_TASKS_CALENDAR_ID}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-3 disabled:opacity-60"
          />
          <p className="text-[10px] font-bold text-gray-500 mb-1">رنگ</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {CALENDAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSettingsColor(c)}
                className={`w-8 h-8 rounded-full border-2 ${
                  settingsColor === c ? 'border-gray-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`رنگ ${c}`}
              />
            ))}
          </div>
          <p className="text-[10px] font-bold text-gray-500 mb-1">اعضا / اشتراک</p>
          {shareCandidates.length === 0 ? (
            <p className="text-sm text-gray-500 mb-3">عضو تیمی برای اشتراک ثبت نشده است.</p>
          ) : (
            <ul className="max-h-40 overflow-y-auto space-y-1 mb-3 border border-gray-100 rounded-xl p-2">
              {shareCandidates.map((p) => (
                <label key={p.id} className="flex items-center gap-2 px-1 py-1 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={settingsShareIds.includes(p.id)}
                    onChange={() =>
                      setSettingsShareIds((prev) =>
                        prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                      )
                    }
                  />
                  {p.name}
                </label>
              ))}
            </ul>
          )}
          <label className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={settingsVisible}
              onChange={(e) => setSettingsVisible(e.target.checked)}
            />
            نمایش این تقویم در لیست
          </label>
          <button
            type="button"
            onClick={saveCalSettings}
            className="nexa-btn-primary w-full py-2 text-sm font-bold"
          >
            ذخیره تنظیمات
          </button>
        </Modal>
      )}

      {showEventModal && (
        <Modal
          title={editingEvent ? 'ویرایش رویداد' : 'رویداد جدید'}
          onClose={() => setShowEventModal(false)}
        >
          <input
            value={evtTitle}
            onChange={(e) => setEvtTitle(e.target.value)}
            placeholder="عنوان"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-2"
          />
          <JalaliDateInput
            value={evtDate}
            onChange={setEvtDate}
            className="mb-1"
            yearMin={DEFAULT_JALALI_YEAR_MIN}
            yearMax={DEFAULT_JALALI_YEAR_MAX}
          />
          {evtDate && (
            <p className="text-[10px] text-gray-500 font-fa-num mb-2">{formatDateKeyJalaliHint(evtDate)}</p>
          )}
          <div className="mb-2">
            <p className="text-[10px] font-bold text-gray-500 mb-1">تاریخ پایان (چندروزه)</p>
            <JalaliDateInput
              value={evtEndDate}
              onChange={setEvtEndDate}
              allowEmpty
              yearMin={DEFAULT_JALALI_YEAR_MIN}
              yearMax={DEFAULT_JALALI_YEAR_MAX}
            />
          </div>
          <label className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={evtAllDay}
              onChange={(e) => setEvtAllDay(e.target.checked)}
            />
            تمام‌روز
          </label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="text-[10px] font-bold text-gray-500">
              شروع
              <input
                type="time"
                value={evtTime}
                onChange={(e) => setEvtTime(e.target.value)}
                disabled={evtAllDay}
                className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mt-0.5 disabled:opacity-50"
              />
            </label>
            <label className="text-[10px] font-bold text-gray-500">
              پایان
              <input
                type="time"
                value={evtEndTime}
                onChange={(e) => setEvtEndTime(e.target.value)}
                disabled={evtAllDay}
                className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mt-0.5 disabled:opacity-50"
              />
            </label>
          </div>
          <select
            value={evtRecurrence}
            onChange={(e) => setEvtRecurrence(e.target.value as MeizitoEventRecurrence)}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-2"
          >
            {(Object.keys(RECURRENCE_LABELS) as MeizitoEventRecurrence[]).map((k) => (
              <option key={k} value={k}>
                {RECURRENCE_LABELS[k]}
              </option>
            ))}
          </select>
          {evtRecurrence !== 'none' && (
            <div className="mb-2">
              <p className="text-[10px] font-bold text-gray-500 mb-1">تکرار تا تاریخ</p>
              <JalaliDateInput
                value={evtRecurrenceUntil}
                onChange={setEvtRecurrenceUntil}
                allowEmpty
                yearMin={DEFAULT_JALALI_YEAR_MIN}
                yearMax={DEFAULT_JALALI_YEAR_MAX}
              />
            </div>
          )}
          <select
            value={evtReminderMinutes}
            onChange={(e) => setEvtReminderMinutes(Number(e.target.value))}
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-2"
          >
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {shareCandidates.length > 0 && (
            <div className="mb-2 max-h-32 overflow-y-auto border border-gray-100 rounded-xl p-2">
              <p className="text-[10px] font-bold text-gray-500 mb-1">شرکت‌کنندگان</p>
              {shareCandidates.map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-0.5 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={evtAttendeeIds.includes(p.id)}
                    onChange={() =>
                      setEvtAttendeeIds((prev) =>
                        prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                      )
                    }
                  />
                  {p.name}
                </label>
              ))}
            </div>
          )}
          <textarea
            value={evtNotes}
            onChange={(e) => setEvtNotes(e.target.value)}
            rows={2}
            placeholder="یادداشت"
            className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-3"
          />
          <button type="button" onClick={saveEvent} className="nexa-btn-primary w-full py-2 text-sm font-bold">
            ذخیره
          </button>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute left-3 top-3 p-1 text-gray-400 hover:text-gray-700"
          aria-label="بستن"
        >
          <X size={18} />
        </button>
        <p className="text-sm font-black text-gray-900 mb-4 pr-6">{title}</p>
        {children}
      </div>
    </div>
  );
}
