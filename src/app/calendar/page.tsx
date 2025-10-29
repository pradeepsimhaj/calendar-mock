// src/app/calendar/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../../lib/auth';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { parseISO, isBefore, isAfter } from 'date-fns';
import EventModal, { AppEvent } from '../../components/EventModal';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const EVENTS_KEY = 'calendar-mock-events-v1';

type Priority = 'high' | 'medium' | 'low';

export default function CalendarPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const calendarRef = useRef<any>(null);

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const reminderTimers = useRef<Record<string, number[]>>({}); // store multiple timers per event

  // UI state for our custom header
  const [currentTitle, setCurrentTitle] = useState<string>('');
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');

  // reminder popup state
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderEvent, setReminderEvent] = useState<AppEvent | null>(null);
  const [reminderText, setReminderText] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  // load events
  useEffect(() => {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (raw) {
      try {
        const parsed: AppEvent[] = JSON.parse(raw);
        setEvents(parsed);
      } catch (e) {
        console.error('failed parse events', e);
      }
    }
  }, []);

  // persist events + reschedule reminders
  useEffect(() => {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    scheduleReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  const getStatusColor = (ev: AppEvent) => {
    const now = new Date();
    const start = parseISO(ev.start);
    const end = parseISO(ev.end);

    if (isBefore(end, now)) return '#94a3b8'; // completed
    const fiveMinBefore = new Date(start.getTime() - 5 * 60 * 1000);
    if (isAfter(now, fiveMinBefore) && isBefore(now, end)) return '#ef4444'; // live
    return '#06b6d4'; // upcoming
  };

  const getPriorityBorder = (priority: Priority) => {
    if (priority === 'high') return '2px solid #b91c1c';
    if (priority === 'medium') return '2px solid #f59e0b';
    return '2px solid #10b981';
  };

  const addEvent = (ev: AppEvent) => {
    const id = cryptoRandomId();
    const newEvent = { ...ev, id };
    setEvents(prev => [...prev, newEvent]);
  };

  const updateEvent = (id: string, changes: Partial<AppEvent>) => {
    setEvents(prev => prev.map(e => (e.id === id ? { ...e, ...changes } : e)));
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // Block date creation for past dates.
  const handleDateClick = (arg: any) => {
    const clickedDate = new Date(arg.dateStr + 'T00:00:00');
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (clickedDate < todayStart) {
      // past day: do nothing
      return;
    }

    setSelectedDate(arg.dateStr);
    setEditingEvent(null);
  };

  // Click on existing event: open view/edit modal
  const handleEventClick = (clickInfo: any) => {
    const id = clickInfo.event.id;
    const ev = events.find(e => e.id === id);
    if (ev) setEditingEvent(ev);
  };

  const fcEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start,
    end: e.end,
    backgroundColor: getStatusColor(e),
    extendedProps: { priority: e.priority },
  }));

  function cryptoRandomId() {
    return Math.random().toString(36).slice(2, 9);
  }

  // Schedule reminders at 15, 10, and 5 minutes before start (display in-app popup)
  function scheduleReminders() {
    // clear existing timers
    Object.values(reminderTimers.current).forEach(arr =>
      arr.forEach(timerId => {
        if (typeof window !== 'undefined') window.clearTimeout(timerId);
      })
    );
    reminderTimers.current = {};

    // schedule for each event
    events.forEach(ev => {
      const start = parseISO(ev.start);
      const offsets = [15, 10, 5]; // minutes before
      const timers: number[] = [];

      offsets.forEach(mins => {
        const remindAt = new Date(start.getTime() - mins * 60 * 1000);
        const ms = remindAt.getTime() - Date.now();
        if (ms > 0) {
          const timer = window.setTimeout(() => {
            setReminderEvent(ev);
            setReminderText(`${mins}`);
            setReminderOpen(true);
          }, ms);
          timers.push(timer);
        }
      });

      if (timers.length) reminderTimers.current[ev.id!] = timers;
    });
  }

  // close reminder popup
  const closeReminder = () => {
    setReminderOpen(false);
    setReminderEvent(null);
    setReminderText('');
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    scheduleReminders();
    return () => {
      Object.values(reminderTimers.current).forEach(arr => arr.forEach(id => window.clearTimeout(id)));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !user) return <div className="p-8">Loading...</div>;

  // helper: open create modal for TODAY via header button
  const openCreateForToday = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`; // 'YYYY-MM-DD'
    setSelectedDate(todayStr);
    setEditingEvent(null);
  };

  // Custom calendar control helpers (use FullCalendar API)
  const goPrev = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.prev();
      setCurrentTitle(api.view.title);
    }
  };
  const goNext = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.next();
      setCurrentTitle(api.view.title);
    }
  };
  const goToday = () => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.today();
      setCurrentTitle(api.view.title);
    }
  };
  const changeView = (viewName: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    const api = calendarRef.current?.getApi();
    if (api) {
      api.changeView(viewName);
      setCurrentView(viewName);
      setCurrentTitle(api.view.title);
    }
  };

  // when calendar changes dates or view, FullCalendar calls datesSet
  const onDatesSet = (arg: any) => {
    // arg.view.title contains "October 2025" etc.
    setCurrentTitle(arg.view.title);
    setCurrentView(arg.view.type as any);
  };

  return (
    <div className="bg-white rounded-xl shadow p-4">
      {/* Header: top row (heading left, create/signout right), second row (controls left, title center, view selector right) */}
      <div className="mb-4 space-y-3">
        {/* TOP ROW */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Your Calendar</h2>
            <p className="text-sm text-slate-500">Click a date to add an event. Click an event to view/edit.</p>
          </div>

          <div className="flex items-start gap-3">
            <button
              onClick={openCreateForToday}
              className="px-3 py-2 bg-green-600 text-white rounded"
            >
              Create Event
            </button>

            <button
              onClick={() => signOut(auth)}
              className="px-3 py-2 bg-rose-500 text-white rounded"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* SECOND ROW */}
        <div className="hidden md:grid md:grid-cols-3 md:items-center md:gap-4">
          {/* left: prev/next/today */}
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="px-6 py-2 bg-slate-800 text-white rounded">‹</button>
            <button onClick={goNext} className="px-6 py-2 bg-slate-800 text-white rounded">›</button>
            <button onClick={goToday} className="px-6 py-2 bg-gray-400 text-white rounded">today</button>
          </div>

          {/* center: title */}
          <div className="flex items-center justify-center">
            <div className="text-xl font-semibold">{currentTitle || ''}</div>
          </div>

          {/* right: view buttons */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => changeView('dayGridMonth')}
              className={`px-3 py-2 rounded ${currentView === 'dayGridMonth' ? 'bg-slate-800 text-white' : 'bg-slate-700 text-white/80'}`}
            >
              month
            </button>
            <button
              onClick={() => changeView('timeGridWeek')}
              className={`px-3 py-2 rounded ${currentView === 'timeGridWeek' ? 'bg-slate-800 text-white' : 'bg-slate-700 text-white/80'}`}
            >
              week
            </button>
            <button
              onClick={() => changeView('timeGridDay')}
              className={`px-3 py-2 rounded ${currentView === 'timeGridDay' ? 'bg-slate-800 text-white' : 'bg-slate-700 text-white/80'}`}
            >
              day
            </button>
          </div>
        </div>

        {/* SECOND ROW (mobile) - stacked so everything remains usable on small screens */}
        <div className="md:hidden flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="px-10 py-2 bg-slate-800 text-white rounded">‹</button>
            <button onClick={goNext} className="px-10 py-2 bg-slate-800 text-white rounded">›</button>
            <button onClick={goToday} className="px-10 py-2 bg-gray-400 text-white rounded">today</button>
          </div>

          <div className="text-center text-xl font-semibold">{currentTitle || ''}</div>

          <div className="flex items-center gap-2 justify-start">
            <button
              onClick={() => changeView('dayGridMonth')}
              className={`px-8 py-2 rounded ${currentView === 'dayGridMonth' ? 'bg-slate-800 text-white' : 'bg-slate-700 text-white/80'}`}
            >
              month
            </button>
            <button
              onClick={() => changeView('timeGridWeek')}
              className={`px-8 py-2 rounded ${currentView === 'timeGridWeek' ? 'bg-slate-800 text-white' : 'bg-slate-700 text-white/80'}`}
            >
              week
            </button>
            <button
              onClick={() => changeView('timeGridDay')}
              className={`px-8 py-2 rounded ${currentView === 'timeGridDay' ? 'bg-slate-800 text-white' : 'bg-slate-700 text-white/80'}`}
            >
              day
            </button>
          </div>
        </div>
      </div>

      {/* Calendar + legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false} // hide the built-in header
            ref={calendarRef}
            events={fcEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            height="auto"
            datesSet={onDatesSet}
          />
        </div>

        <aside className="bg-slate-50 p-4 rounded">
          <h3 className="font-semibold mb-2">Legend</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded" style={{ background: '#06b6d4' }} />
              <div>Upcoming</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded" style={{ background: '#ef4444' }} />
              <div>Live (5 min before → end)</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 rounded" style={{ background: '#94a3b8' }} />
              <div>Completed</div>
            </div>

            <hr className="my-2" />
            <div>Priority borders:</div>
            <div className="mt-2 space-y-2">
              <div className="p-2 rounded" style={{ border: getPriorityBorder('high') }}>High</div>
              <div className="p-2 rounded" style={{ border: getPriorityBorder('medium') }}>Medium</div>
              <div className="p-2 rounded" style={{ border: getPriorityBorder('low') }}>Low</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Event Modal */}
      <EventModal
        open={!!selectedDate || !!editingEvent}
        onClose={() => {
          setSelectedDate(null);
          setEditingEvent(null);
        }}
        date={selectedDate}
        event={editingEvent}
        onSave={(payload) => {
          if (payload.id) updateEvent(payload.id, payload);
          else addEvent(payload);
          setSelectedDate(null);
          setEditingEvent(null);
        }}
        onDelete={(id) => {
          deleteEvent(id);
          setEditingEvent(null);
        }}
      />

      {/* Reminder Popup */}
      {reminderOpen && reminderEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeReminder} />
          <div className="bg-white rounded-lg shadow p-6 z-10 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Upcoming Reminder</h3>
            <p className="font-semibold">{reminderEvent.title}</p>
            <p className="text-sm text-slate-600">
              {new Date(reminderEvent.start).toLocaleString()} — {new Date(reminderEvent.end).toLocaleString()}
            </p>
            <p className="mt-2">Priority: <span className="font-medium">{reminderEvent.priority}</span></p>
            <p className="mt-3 text-slate-700">{reminderText} minutes before</p>

            <div className="mt-4 flex justify-center">
              <button onClick={closeReminder} className="px-4 py-2 bg-indigo-600 text-white rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
