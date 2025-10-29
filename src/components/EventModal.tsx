// src/components/EventModal.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { addHours, isAfter, isBefore, isSameDay, parseISO } from 'date-fns';

type Priority = 'high' | 'medium' | 'low';
export type AppEvent = {
  id?: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  priority: Priority;
};

export default function EventModal({
  open,
  onClose,
  date,
  event,
  onSave,
  onDelete
}: {
  open: boolean;
  onClose: () => void;
  date: string | null;
  event: AppEvent | null;
  onSave: (payload: AppEvent) => void;
  onDelete: (id: string) => void;
}) {
  const now = new Date();

  // determine if event is in the past (completed)
  const eventCompleted = event ? isBefore(parseISO(event.end), new Date()) : false;

  const [mode, setMode] = useState<'view' | 'edit'>('edit'); // 'view' for existing event
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // form state
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(''); // local datetime-local string
  const [end, setEnd] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [error, setError] = useState<string | null>(null);

  // compute min start for today (now +1h) as local input string
  const minStartForToday = useMemo(() => {
    const d = addHours(now, 1);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (event) {
      // open existing => view mode
      setMode('view');
      setTitle(event.title || '');
      setStart(isoToLocalInput(event.start));
      setEnd(isoToLocalInput(event.end));
      setPriority(event.priority || 'medium');
    } else if (date) {
      setMode('edit');
      setTitle('');
      // if date is today -> default start = now+1h, end = start+1h
      const selected = new Date(date + 'T00:00:00');
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (selected.getTime() === todayStart.getTime()) {
        setStart(minStartForToday);
        // end = start + 1h
        const s = new Date(minStartForToday);
        const e = addHours(new Date(s), 1);
        setEnd(isoToLocalInput(e.toISOString()));
      } else {
        setStart(date + 'T09:00');
        setEnd(date + 'T10:00');
      }
      setPriority('medium');
    } else {
      setMode('edit');
      setTitle('');
      setStart('');
      setEnd('');
      setPriority('medium');
    }
    setError(null);
    setShowDeleteConfirm(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event, date]);

  function isoToLocalInput(iso: string) {
    const d = new Date(iso);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  function localInputToISO(val: string) {
    const d = new Date(val);
    return d.toISOString();
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!start || !end) {
      setError('Start and end are required.');
      return;
    }

    const sISO = localInputToISO(start);
    const eISO = localInputToISO(end);

    if (isAfter(new Date(sISO), new Date(eISO)) || new Date(sISO).getTime() === new Date(eISO).getTime()) {
      setError('End time must be greater than start time.');
      return;
    }

    // if start date is today, ensure start >= now + 1 hour
    const selectedDate = start.split('T')[0];
    const todayStr = now.toISOString().slice(0, 10);
    if (selectedDate === todayStr) {
      const minStart = addHours(now, 1);
      if (new Date(sISO) < minStart) {
        setError('Start time for today must be at least current time + 1 hour.');
        return;
      }
    }

    const payload: AppEvent = {
      title: title.trim(),
      start: sISO,
      end: eISO,
      priority,
    };
    if (event?.id) payload.id = event.id;
    onSave(payload);
  };

  // show delete confirm overlay when user clicks Delete (in edit mode)
  const confirmDelete = () => {
    setShowDeleteConfirm(true);
  };

  const doDelete = () => {
    if (event?.id) {
      onDelete(event.id);
      setShowDeleteConfirm(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (!open) return null;

  const isCompleted = eventCompleted && !!event;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => { if (!showDeleteConfirm && !isCompleted && mode === 'view') onClose(); }} />

      <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-full max-w-md">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {event ? (mode === 'view' ? 'Event Details' : 'Edit Event') : 'Add Event'}
          </h3>
        </div>

        {/* Completed - read-only */}
        {isCompleted ? (
          <div className="mt-4">
            <p className="font-semibold text-lg">{event!.title}</p>
            <p className="text-sm text-slate-600 mt-1">
              {new Date(event!.start).toLocaleString()} — {new Date(event!.end).toLocaleString()}
            </p>
            <p className="mt-2">Priority: <span className="font-medium">{event!.priority}</span></p>

            <div className="mt-6 flex justify-center">
              <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded">Close</button>
            </div>
          </div>
        ) : (
          <>
            {/* View mode for upcoming events */}
            {mode === 'view' && event ? (
              <div className="mt-4">
                <p className="font-semibold text-lg">{event.title}</p>
                <p className="text-sm text-slate-600 mt-1">
                  {new Date(event.start).toLocaleString()} — {new Date(event.end).toLocaleString()}
                </p>
                <p className="mt-2">Priority: <span className="font-medium">{event.priority}</span></p>

                <div className="mt-6 flex justify-center gap-4">
                  <button onClick={() => setMode('edit')} className="px-4 py-2 bg-amber-500 text-white rounded">Edit</button>
                  <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded">Close</button>
                </div>
              </div>
            ) : (
              // Edit/create mode
              <form onSubmit={handleSave} className="mt-4 space-y-3">
                <div>
                  <label className="text-sm">Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} required className="w-full border p-2 rounded mt-1" />
                </div>

                <div>
                  <label className="text-sm">Start</label>
                  <input
                    type="datetime-local"
                    value={start}
                    onChange={e => setStart(e.target.value)}
                    required
                    className="w-full border p-2 rounded mt-1"
                    min={isSameDay(new Date(start || ''), now) ? minStartForToday : undefined}
                  />
                </div>

                <div>
                  <label className="text-sm">End</label>
                  <input
                    type="datetime-local"
                    value={end}
                    onChange={e => setEnd(e.target.value)}
                    required
                    className="w-full border p-2 rounded mt-1"
                    min={start || undefined}
                  />
                </div>

                <div>
                  <label className="text-sm">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full border p-2 rounded mt-1">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                {error && <div className="text-sm text-rose-600">{error}</div>}

                <div className="flex justify-center gap-3 mt-4">
                  {event?.id && (
                    <button type="button" onClick={confirmDelete} className="px-4 py-2 bg-rose-500 text-white rounded">Delete</button>
                  )}

                  <button type="button" onClick={() => {
                    if (event) {
                      // revert to view mode
                      setTitle(event.title); setStart(isoToLocalInput(event.start)); setEnd(isoToLocalInput(event.end)); setPriority(event.priority);
                      setMode('view');
                    } else {
                      onClose();
                    }
                  }} className="px-4 py-2 border rounded">Cancel</button>

                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">Save</button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation modal overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={cancelDelete} />
          <div className="bg-white rounded-lg shadow p-6 z-70 w-full max-w-sm">
            <h4 className="text-lg font-semibold mb-2">Confirm Delete</h4>
            <p>Are you sure you want to delete this event?</p>

            <div className="mt-4 flex justify-center gap-4">
              <button onClick={doDelete} className="px-4 py-2 bg-rose-500 text-white rounded">Yes</button>
              <button onClick={cancelDelete} className="px-4 py-2 border rounded">No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
