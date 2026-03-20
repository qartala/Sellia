import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar, MapPin,
  User, RefreshCw, Trash2, Edit2, Check, LinkIcon,
  CalendarDays, CalendarRange
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const EVENT_TYPES = [
  { value: "meeting",     label: "Reunión",       color: "#6366f1" },
  { value: "call",        label: "Llamada",        color: "#10b981" },
  { value: "follow_up",  label: "Seguimiento",    color: "#f59e0b" },
  { value: "appointment", label: "Cita",           color: "#ec4899" },
  { value: "demo",        label: "Demo",           color: "#8b5cf6" },
  { value: "google",      label: "Google Calendar",color: "#0ea5e9" },
  { value: "other",       label: "Otro",           color: "#64748b" },
];

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function getTypeColor(type: string): string {
  return EVENT_TYPES.find(t => t.value === type)?.color || "#6366f1";
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

function toDatetimeLocal(iso: string): string {
  // "2026-03-18T14:00:00" → already correct for input
  return iso.substring(0, 16);
}

function fromDatetimeLocal(local: string): string {
  return local + ":00";
}

interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  all_day: number;
  type: string;
  color: string;
  lead_id: number | null;
  lead_name: string | null;
  location: string;
  google_event_id: string | null;
}

interface EventFormData {
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  type: string;
  color: string;
  lead_id: string;
  location: string;
}

const defaultForm = (): EventFormData => {
  const now = new Date();
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  return {
    title: "", description: "", start_datetime: fmt(start),
    end_datetime: fmt(end), all_day: false, type: "meeting",
    color: "#6366f1", lead_id: "", location: "",
  };
};

export default function CalendarPage() {
  const [darkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const dm = darkMode;

  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; calendarId?: string }>({ connected: false });
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventFormData>(defaultForm());
  const [saving, setSavingEvent] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Selected day detail
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const showToast = (ok: boolean, text: string) => {
    setSyncMsg({ ok, text });
    setTimeout(() => setSyncMsg(null), 4000);
  };

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, "0");
      const data = await api.getCalendarEvents({ month: `${y}-${m}` });
      setEvents(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadEvents();
    api.getCalendarLeads().then(setLeads).catch(() => {});
    api.getGoogleCalendarStatus().then(setGoogleStatus).catch(() => {});
  }, [loadEvents]);

  // Check if coming back from Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected")) {
      showToast(true, "Google Calendar conectado correctamente.");
      api.getGoogleCalendarStatus().then(setGoogleStatus).catch(() => {});
      window.history.replaceState({}, "", "/calendar");
    }
    if (params.get("calendar_error")) {
      showToast(false, "Error al conectar Google Calendar: " + decodeURIComponent(params.get("calendar_error")!));
      window.history.replaceState({}, "", "/calendar");
    }
  }, []);

  // Navigation
  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };
  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  // Google Calendar
  const handleConnectGoogle = async () => {
    try {
      const { authUrl } = await api.getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (err: any) {
      showToast(false, err.message);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.syncGoogleCalendar();
      showToast(true, result.message);
      loadEvents();
      api.getGoogleCalendarStatus().then(setGoogleStatus).catch(() => {});
    } catch (err: any) {
      showToast(false, err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("¿Desconectar Google Calendar? Los eventos importados quedarán en Sellia.")) return;
    try {
      await api.disconnectGoogleCalendar();
      setGoogleStatus({ connected: false });
      showToast(true, "Google Calendar desconectado.");
    } catch (err: any) {
      showToast(false, err.message);
    }
  };

  // Event CRUD
  const openCreate = (date?: Date) => {
    const f = defaultForm();
    if (date) {
      const dateStr = `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
      f.start_datetime = `${dateStr}T09:00`;
      f.end_datetime = `${dateStr}T10:00`;
    }
    setForm(f);
    setEditingEvent(null);
    setModalError(null);
    setShowModal(true);
  };

  const openEdit = (evt: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({
      title: evt.title, description: evt.description, location: evt.location,
      start_datetime: toDatetimeLocal(evt.start_datetime),
      end_datetime: toDatetimeLocal(evt.end_datetime),
      all_day: !!evt.all_day, type: evt.type, color: evt.color,
      lead_id: evt.lead_id ? String(evt.lead_id) : "",
    });
    setEditingEvent(evt);
    setModalError(null);
    setShowModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingEvent(true);
    setModalError(null);
    try {
      const payload = {
        ...form,
        start_datetime: fromDatetimeLocal(form.start_datetime),
        end_datetime: fromDatetimeLocal(form.end_datetime),
        lead_id: form.lead_id ? Number(form.lead_id) : undefined,
      };
      if (editingEvent) {
        await api.updateCalendarEvent(editingEvent.id, payload);
      } else {
        await api.createCalendarEvent(payload);
      }
      setShowModal(false);
      loadEvents();
    } catch (err: any) {
      setModalError(err.message || 'Error al guardar el evento.');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar este evento?")) return;
    try {
      await api.deleteCalendarEvent(id);
      setEvents(prev => prev.filter(ev => ev.id !== id));
      if (editingEvent?.id === id) setShowModal(false);
    } catch (err: any) {
      showToast(false, err.message);
    }
  };

  // Calendar grid helpers
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const eventsForDay = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${pad2(date.getMonth()+1)}-${pad2(date.getDate())}`;
    return events.filter(ev => ev.start_datetime.startsWith(dateStr));
  };

  const isToday = (date: Date) => {
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
  };

  const card = cn("rounded-xl border", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm");
  const inputCls = cn("w-full px-3 py-2 rounded-lg text-sm placeholder:opacity-50 outline-none border focus:ring-1 focus:ring-indigo-500 transition",
    dm ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500");

  const monthDays = getMonthDays();
  const weekDays = getWeekDays();

  // Selected day events
  const selectedDayEvents = selectedDay ? eventsForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className={cn("text-2xl font-bold", dm ? "text-white" : "text-slate-900")}>Calendario</h1>
          <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>
            Gestiona citas, reuniones y agendamiento — sincronizado con Google Calendar.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Google Calendar */}
          {googleStatus.connected ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Check className="w-3.5 h-3.5" /> Google Calendar
              </span>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-500/10 text-sky-500 border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                Sincronizar
              </button>
              <button onClick={handleDisconnectGoogle} className={cn("p-1.5 rounded-lg transition-colors text-xs", dm ? "text-slate-500 hover:text-rose-400" : "text-slate-400 hover:text-rose-600")}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectGoogle}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300/30 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <LinkIcon className="w-4 h-4 text-sky-400" />
              <span className={dm ? "text-slate-300" : "text-slate-700"}>Conectar Google Calendar</span>
            </button>
          )}

          {/* View toggle */}
          <div className={cn("flex rounded-lg border overflow-hidden", dm ? "border-slate-700" : "border-slate-200")}>
            <button
              onClick={() => setViewMode("month")}
              className={cn("px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors", viewMode === "month"
                ? "bg-indigo-600 text-white" : dm ? "text-slate-400 hover:text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <CalendarRange className="w-4 h-4" /> Mes
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn("px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors", viewMode === "week"
                ? "bg-indigo-600 text-white" : dm ? "text-slate-400 hover:text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <CalendarDays className="w-4 h-4" /> Semana
            </button>
          </div>

          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Evento
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button onClick={prevPeriod} className={cn("p-2 rounded-lg transition-colors", dm ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100")}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={nextPeriod} className={cn("p-2 rounded-lg transition-colors", dm ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100")}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <h2 className={cn("text-lg font-semibold", dm ? "text-white" : "text-slate-900")}>
          {viewMode === "month"
            ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
            : (() => {
                const wk = getWeekDays();
                return `${pad2(wk[0].getDate())} ${MONTHS[wk[0].getMonth()].substring(0,3)} — ${pad2(wk[6].getDate())} ${MONTHS[wk[6].getMonth()].substring(0,3)} ${wk[6].getFullYear()}`;
              })()
          }
        </h2>
        <button onClick={goToday} className={cn("px-3 py-1 rounded-lg text-sm font-medium border transition-colors", dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
          Hoy
        </button>
        {loading && <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />}
      </div>

      <div className="flex gap-6">
        {/* Calendar grid */}
        <div className={cn("flex-1 rounded-xl border overflow-hidden", dm ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white shadow-sm")}>
          {/* Weekday headers */}
          <div className="grid grid-cols-7">
            {WEEKDAYS.map(d => (
              <div key={d} className={cn("py-2 text-center text-xs font-semibold uppercase tracking-wider border-b", dm ? "text-slate-500 border-slate-800" : "text-slate-400 border-slate-100")}>
                {d}
              </div>
            ))}
          </div>

          {viewMode === "month" ? (
            // Month view
            <div className="grid grid-cols-7">
              {monthDays.map((day, idx) => {
                const dayEvts = day ? eventsForDay(day) : [];
                const today = day ? isToday(day) : false;
                const selected = day && selectedDay
                  ? day.toDateString() === selectedDay.toDateString() : false;

                return (
                  <div
                    key={idx}
                    onClick={() => day && setSelectedDay(selected ? null : day)}
                    className={cn(
                      "min-h-[90px] p-1.5 border-b border-r cursor-pointer transition-colors",
                      dm ? "border-slate-800" : "border-slate-100",
                      !day ? (dm ? "bg-slate-900/50" : "bg-slate-50/50") : "",
                      day && !selected ? (dm ? "hover:bg-slate-800/60" : "hover:bg-slate-50") : "",
                      selected ? (dm ? "bg-indigo-500/10" : "bg-indigo-50") : ""
                    )}
                  >
                    {day && (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium",
                            today ? "bg-indigo-600 text-white" : dm ? "text-slate-300" : "text-slate-700"
                          )}>
                            {day.getDate()}
                          </span>
                          {day && (
                            <button
                              onClick={e => { e.stopPropagation(); openCreate(day); }}
                              className={cn("opacity-0 hover:opacity-100 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center transition-all", dm ? "text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/15" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50")}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvts.slice(0, 3).map(evt => (
                            <div
                              key={evt.id}
                              onClick={e => openEdit(evt, e)}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer border-l-2 truncate transition-opacity hover:opacity-80"
                              style={{ backgroundColor: (evt.color || getTypeColor(evt.type)) + "20", borderLeftColor: evt.color || getTypeColor(evt.type) }}
                            >
                              <span className="truncate" style={{ color: evt.color || getTypeColor(evt.type) }}>
                                {evt.all_day ? "" : new Date(evt.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " "}
                                {evt.title}
                              </span>
                            </div>
                          ))}
                          {dayEvts.length > 3 && (
                            <div className={cn("text-xs px-1", dm ? "text-slate-500" : "text-slate-400")}>
                              +{dayEvts.length - 3} más
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            // Week view
            <div>
              <div className="grid grid-cols-7">
                {weekDays.map((day, idx) => {
                  const today = isToday(day);
                  const dayEvts = eventsForDay(day);
                  return (
                    <div key={idx} className={cn("border-r min-h-[300px]", dm ? "border-slate-800" : "border-slate-100")}>
                      {/* Day header */}
                      <div
                        onClick={() => setSelectedDay(selectedDay?.toDateString() === day.toDateString() ? null : day)}
                        className={cn(
                          "py-3 text-center border-b cursor-pointer transition-colors",
                          dm ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-slate-50",
                          today ? (dm ? "bg-indigo-500/10" : "bg-indigo-50") : ""
                        )}
                      >
                        <div className={cn("text-xs uppercase font-medium mb-1", dm ? "text-slate-500" : "text-slate-400")}>
                          {WEEKDAYS[idx]}
                        </div>
                        <div className={cn("w-8 h-8 mx-auto flex items-center justify-center rounded-full text-sm font-bold",
                          today ? "bg-indigo-600 text-white" : dm ? "text-slate-200" : "text-slate-800"
                        )}>
                          {day.getDate()}
                        </div>
                      </div>

                      {/* Day events */}
                      <div className="p-1.5 space-y-1">
                        {dayEvts.map(evt => (
                          <div
                            key={evt.id}
                            onClick={e => openEdit(evt, e)}
                            className="rounded-lg p-2 cursor-pointer transition-opacity hover:opacity-80 text-xs"
                            style={{ backgroundColor: (evt.color || getTypeColor(evt.type)) + "25", borderLeft: `3px solid ${evt.color || getTypeColor(evt.type)}` }}
                          >
                            <div className="font-semibold truncate" style={{ color: evt.color || getTypeColor(evt.type) }}>
                              {evt.title}
                            </div>
                            {!evt.all_day && (
                              <div className={cn("mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>
                                {new Date(evt.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => openCreate(day)}
                          className={cn("w-full py-1 rounded text-xs transition-colors opacity-40 hover:opacity-100", dm ? "text-slate-500 hover:text-indigo-400" : "text-slate-400 hover:text-indigo-600")}
                        >
                          <Plus className="w-3 h-3 mx-auto" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: selected day or upcoming events */}
        <div className="w-72 space-y-4 shrink-0">
          {/* Selected day events */}
          {selectedDay ? (
            <div className={cn(card, "overflow-hidden")}>
              <div className={cn("p-4 border-b flex items-center justify-between", dm ? "border-slate-800" : "border-slate-200")}>
                <div>
                  <p className={cn("font-semibold text-sm", dm ? "text-white" : "text-slate-900")}>
                    {WEEKDAYS[selectedDay.getDay()]}, {selectedDay.getDate()} de {MONTHS[selectedDay.getMonth()]}
                  </p>
                  <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>
                    {selectedDayEvents.length} evento{selectedDayEvents.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button onClick={() => openCreate(selectedDay)} className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y" style={{ maxHeight: 400, overflowY: "auto" }}>
                {selectedDayEvents.length === 0 ? (
                  <div className={cn("p-6 text-center text-sm", dm ? "text-slate-500" : "text-slate-400")}>
                    Sin eventos. Haz clic en + para crear uno.
                  </div>
                ) : selectedDayEvents.map(evt => (
                  <div key={evt.id} className={cn("p-3 transition-colors", dm ? "divide-slate-800 hover:bg-slate-800/40" : "divide-slate-100 hover:bg-slate-50")}>
                    <div className="flex items-start gap-2">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: evt.color || getTypeColor(evt.type) }} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium truncate", dm ? "text-white" : "text-slate-900")}>{evt.title}</p>
                        {!evt.all_day && (
                          <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>
                            {new Date(evt.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} —{" "}
                            {new Date(evt.end_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        {evt.location && (
                          <p className={cn("text-xs mt-0.5 flex items-center gap-1", dm ? "text-slate-500" : "text-slate-400")}>
                            <MapPin className="w-3 h-3" /> {evt.location}
                          </p>
                        )}
                        {evt.lead_name && (
                          <p className={cn("text-xs mt-0.5 flex items-center gap-1", dm ? "text-slate-500" : "text-slate-400")}>
                            <User className="w-3 h-3" /> {evt.lead_name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={e => openEdit(evt, e)} className={cn("p-1 rounded transition-colors", dm ? "text-slate-500 hover:text-indigo-300" : "text-slate-400 hover:text-indigo-600")}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => handleDeleteEvent(evt.id, e)} className={cn("p-1 rounded transition-colors", dm ? "text-slate-500 hover:text-rose-400" : "text-slate-400 hover:text-rose-600")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Upcoming events */
            <div className={cn(card, "overflow-hidden")}>
              <div className={cn("p-4 border-b", dm ? "border-slate-800" : "border-slate-200")}>
                <p className={cn("font-semibold text-sm", dm ? "text-white" : "text-slate-900")}>Próximos Eventos</p>
              </div>
              <div className="divide-y" style={{ maxHeight: 400, overflowY: "auto" }}>
                {events.filter(ev => new Date(ev.start_datetime) >= new Date()).slice(0, 8).length === 0 ? (
                  <div className={cn("p-6 text-center text-sm", dm ? "text-slate-500" : "text-slate-400")}>
                    No hay eventos próximos.
                  </div>
                ) : events
                  .filter(ev => new Date(ev.start_datetime) >= new Date())
                  .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))
                  .slice(0, 8)
                  .map(evt => (
                    <div
                      key={evt.id}
                      onClick={e => openEdit(evt, e)}
                      className={cn("p-3 cursor-pointer transition-colors", dm ? "hover:bg-slate-800/40" : "hover:bg-slate-50")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: evt.color || getTypeColor(evt.type) }} />
                          <div className="min-w-0">
                            <p className={cn("text-sm font-medium truncate", dm ? "text-white" : "text-slate-900")}>{evt.title}</p>
                            <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>
                              {new Date(evt.start_datetime).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                              {!evt.all_day && " · " + new Date(evt.start_datetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={e => openEdit(evt, e)} className={cn("p-1 rounded transition-colors", dm ? "text-slate-500 hover:text-indigo-300" : "text-slate-400 hover:text-indigo-600")}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => handleDeleteEvent(evt.id, e)} className={cn("p-1 rounded transition-colors", dm ? "text-slate-500 hover:text-rose-400" : "text-slate-400 hover:text-rose-600")}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Legend */}
          <div className={cn(card, "p-4")}>
            <p className={cn("text-xs font-semibold uppercase tracking-wider mb-3", dm ? "text-slate-400" : "text-slate-500")}>Tipos de Evento</p>
            <div className="space-y-1.5">
              {EVENT_TYPES.filter(t => t.value !== "google").map(t => (
                <div key={t.value} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <span className={cn("text-xs", dm ? "text-slate-300" : "text-slate-600")}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={cn("rounded-2xl shadow-2xl w-full max-w-lg border max-h-[90vh] overflow-y-auto", dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
            <div className={cn("px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
              <h3 className={cn("font-semibold text-lg flex items-center gap-2", dm ? "text-white" : "text-slate-900")}>
                <Calendar className="w-5 h-5 text-indigo-500" />
                {editingEvent ? "Editar Evento" : "Nuevo Evento"}
              </h3>
              <button onClick={() => setShowModal(false)} className={cn("transition-colors", dm ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Título *</label>
                <input
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Reunión con cliente, Llamada de seguimiento..."
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Inicio *</label>
                  <input
                    required
                    type={form.all_day ? "date" : "datetime-local"}
                    value={form.all_day ? form.start_datetime.split("T")[0] : form.start_datetime}
                    onChange={e => setForm({ ...form, start_datetime: form.all_day ? e.target.value + "T00:00" : e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Fin *</label>
                  <input
                    required
                    type={form.all_day ? "date" : "datetime-local"}
                    value={form.all_day ? form.end_datetime.split("T")[0] : form.end_datetime}
                    onChange={e => setForm({ ...form, end_datetime: form.all_day ? e.target.value + "T23:59" : e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.all_day}
                  onChange={e => setForm({ ...form, all_day: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className={cn("text-sm", dm ? "text-slate-300" : "text-slate-700")}>Todo el día</span>
              </label>

              <div>
                <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {EVENT_TYPES.filter(t => t.value !== "google").map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm({ ...form, type: t.value, color: t.color })}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5",
                        form.type === t.value
                          ? "border-2 bg-opacity-20"
                          : dm ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                      )}
                      style={form.type === t.value ? { borderColor: t.color, color: t.color, backgroundColor: t.color + "15" } : {}}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Notas del evento..."
                  rows={2}
                  className={cn(inputCls, "resize-none")}
                />
              </div>

              <div>
                <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />Ubicación
                </label>
                <input
                  value={form.location}
                  onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="Sala de reuniones, Zoom, dirección..."
                  className={inputCls}
                />
              </div>

              {leads.length > 0 && (
                <div>
                  <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>
                    <User className="w-3.5 h-3.5 inline mr-1" />Lead asociado (opcional)
                  </label>
                  <select
                    value={form.lead_id}
                    onChange={e => setForm({ ...form, lead_id: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Sin lead asociado</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.name}{l.company ? ` (${l.company})` : ""}</option>
                    ))}
                  </select>
                </div>
              )}

              {modalError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm">
                  <X className="w-4 h-4 shrink-0" />
                  {modalError}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: dm ? "#1e293b" : "#e2e8f0" }}>
                <div>
                  {editingEvent && (
                    <button
                      type="button"
                      onClick={e => handleDeleteEvent(editingEvent.id, e)}
                      className="text-sm text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className={cn("px-4 py-2 text-sm rounded-lg transition-colors", dm ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editingEvent ? "Guardar cambios" : "Crear evento"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {syncMsg && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-3",
          syncMsg.ok
            ? dm ? "bg-emerald-900 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-700"
            : dm ? "bg-rose-900 border-rose-700 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-700"
        )}>
          {syncMsg.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {syncMsg.text}
        </div>
      )}
    </div>
  );
}
