import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, Plus, Trash2, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, X, ChevronRight, Phone, FileText, Link, CreditCard,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Installment {
  id: number;
  plan_id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: "pending" | "paid" | "overdue";
  paid_at: string | null;
  sentMessages?: { id: number; message_type: string; sent_at: string }[];
}

interface Plan {
  id: number;
  user_id: number;
  lead_id: number | null;
  name: string;
  debtor_name: string;
  debtor_phone: string;
  total_amount: number;
  installments_count: number;
  payment_link: string;
  bank_info: string;
  notes: string;
  status: "active" | "paused" | "completed";
  created_at: string;
  installments: Installment[];
  nextDue?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmount(n: number) {
  return n.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const MSG_LABELS: Record<string, string> = {
  reminder_5d: "📅 -5d",
  due_day: "📅 Hoy",
  late_3d: "⚠️ +3d",
  late_7d: "🔴 +7d",
  late_15d: "🚨 +15d",
};

// ─── Status badges ────────────────────────────────────────────────────────────

function InstallmentBadge({ status }: { status: string }) {
  if (status === "paid") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
      <CheckCircle2 className="w-3 h-3" /> Pagada
    </span>
  );
  if (status === "overdue") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
      <AlertTriangle className="w-3 h-3" /> Vencida
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400">
      <Clock className="w-3 h-3" /> Pendiente
    </span>
  );
}

function PlanStatusDot({ status }: { status: string }) {
  if (status === "active") return <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5" />;
  if (status === "completed") return <span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-1.5" />;
  return <span className="w-2 h-2 rounded-full bg-slate-400 inline-block mr-1.5" />;
}

// ─── New Plan Modal ───────────────────────────────────────────────────────────

interface NewPlanModalProps {
  dm: boolean;
  leads: any[];
  onClose: () => void;
  onCreate: (plan: Plan) => void;
}

function NewPlanModal({ dm, leads, onClose, onCreate }: NewPlanModalProps) {
  const [form, setForm] = useState({
    name: "",
    leadId: "",
    debtorName: "",
    debtorPhone: "",
    totalAmount: "",
    installmentsCount: "1",
    startDate: new Date().toISOString().split("T")[0],
    paymentLink: "",
    bankInfo: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleLeadChange = (leadId: string) => {
    const lead = leads.find(l => String(l.id) === leadId);
    setForm(f => ({
      ...f,
      leadId,
      debtorName: lead?.name || f.debtorName,
      debtorPhone: lead?.phone_number || f.debtorPhone,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.debtorName || !form.totalAmount || !form.startDate) {
      setError("Completa los campos requeridos.");
      return;
    }
    setSaving(true);
    try {
      const plan = await api.createCollection({
        name: form.name,
        leadId: form.leadId ? parseInt(form.leadId) : undefined,
        debtorName: form.debtorName,
        debtorPhone: form.debtorPhone,
        totalAmount: parseFloat(form.totalAmount),
        installmentsCount: parseInt(form.installmentsCount) || 1,
        startDate: form.startDate,
        paymentLink: form.paymentLink,
        bankInfo: form.bankInfo,
        notes: form.notes,
      });
      onCreate(plan);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error al crear el plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={cn(
        "w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden",
        dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
      )}>
        <div className={cn("flex items-center justify-between px-6 py-4 border-b", dm ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50")}>
          <h2 className={cn("font-semibold text-base", dm ? "text-white" : "text-slate-900")}>Nueva Cobranza</h2>
          <button onClick={onClose} className={cn("p-1.5 rounded-lg transition-colors", dm ? "text-slate-400 hover:bg-slate-700" : "text-slate-400 hover:bg-slate-200")}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-500/20">
              {error}
            </div>
          )}

          <Field label="Nombre del plan *" dm={dm}>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Cuotas servicio legal Juan Pérez"
              className={inputCls(dm)}
            />
          </Field>

          {leads.length > 0 && (
            <Field label="Lead vinculado (opcional)" dm={dm}>
              <select
                value={form.leadId}
                onChange={e => handleLeadChange(e.target.value)}
                className={inputCls(dm)}
              >
                <option value="">— Sin lead —</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.name} {l.company ? `(${l.company})` : ""}</option>
                ))}
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre del deudor *" dm={dm}>
              <input
                type="text"
                value={form.debtorName}
                onChange={e => setForm(f => ({ ...f, debtorName: e.target.value }))}
                placeholder="Nombre completo"
                className={inputCls(dm)}
              />
            </Field>
            <Field label="Teléfono WhatsApp" dm={dm}>
              <input
                type="text"
                value={form.debtorPhone}
                onChange={e => setForm(f => ({ ...f, debtorPhone: e.target.value }))}
                placeholder="+56912345678"
                className={inputCls(dm)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto total *" dm={dm}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.totalAmount}
                onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))}
                placeholder="0.00"
                className={inputCls(dm)}
              />
            </Field>
            <Field label="Número de cuotas" dm={dm}>
              <input
                type="number"
                min="1"
                max="24"
                value={form.installmentsCount}
                onChange={e => setForm(f => ({ ...f, installmentsCount: e.target.value }))}
                className={inputCls(dm)}
              />
            </Field>
          </div>

          <Field label="Fecha primera cuota *" dm={dm}>
            <input
              type="date"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              className={inputCls(dm)}
            />
          </Field>

          <Field label="Link de pago (opcional)" dm={dm}>
            <input
              type="text"
              value={form.paymentLink}
              onChange={e => setForm(f => ({ ...f, paymentLink: e.target.value }))}
              placeholder="https://..."
              className={inputCls(dm)}
            />
          </Field>

          <Field label="Datos bancarios (opcional)" dm={dm}>
            <textarea
              rows={2}
              value={form.bankInfo}
              onChange={e => setForm(f => ({ ...f, bankInfo: e.target.value }))}
              placeholder="Banco / Cuenta / RUT..."
              className={inputCls(dm)}
            />
          </Field>

          <Field label="Notas (opcional)" dm={dm}>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Observaciones internas..."
              className={inputCls(dm)}
            />
          </Field>

          {form.totalAmount && parseInt(form.installmentsCount) > 0 && (
            <div className={cn("rounded-lg px-3 py-2 text-xs border", dm ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600")}>
              Cuota mensual estimada: <strong>${fmtAmount(parseFloat(form.totalAmount || "0") / (parseInt(form.installmentsCount) || 1))}</strong>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={cn("flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors", dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50")}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Guardando..." : "Crear plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, dm, children }: { label: string; dm: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={cn("block text-xs font-medium mb-1", dm ? "text-slate-400" : "text-slate-600")}>{label}</label>
      {children}
    </div>
  );
}

function inputCls(dm: boolean) {
  return cn(
    "w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all",
    dm
      ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
      : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500"
  );
}

// ─── Plan Detail Panel ────────────────────────────────────────────────────────

interface PlanDetailProps {
  plan: Plan;
  dm: boolean;
  onMarkPaid: (installmentId: number) => void;
  onMarkUnpaid: (installmentId: number) => void;
  onDelete: (planId: number) => void;
}

function PlanDetail({ plan, dm, onMarkPaid, onMarkUnpaid, onDelete }: PlanDetailProps) {
  const paidCount = plan.installments.filter(i => i.status === "paid").length;
  const total = plan.installments.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn("px-5 py-4 border-b shrink-0", dm ? "border-slate-700" : "border-slate-200")}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className={cn("font-semibold text-base", dm ? "text-white" : "text-slate-900")}>{plan.name}</h3>
            <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>
              <PlanStatusDot status={plan.status} />
              {plan.status === "active" ? "Activo" : plan.status === "completed" ? "Completado" : "Pausado"}
              {" · "}Creado {fmtDate(plan.created_at.split("T")[0])}
            </p>
          </div>
          <button
            onClick={() => onDelete(plan.id)}
            className={cn("p-1.5 rounded-lg transition-colors shrink-0", dm ? "text-slate-500 hover:bg-red-500/10 hover:text-red-400" : "text-slate-400 hover:bg-red-50 hover:text-red-600")}
            title="Eliminar plan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <InfoChip dm={dm} icon={<DollarSign className="w-3.5 h-3.5" />} label="Total" value={`$${fmtAmount(plan.total_amount)}`} />
          <InfoChip dm={dm} icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Pagadas" value={`${paidCount}/${total}`} />
          <InfoChip dm={dm} icon={<Phone className="w-3.5 h-3.5" />} label="Teléfono" value={plan.debtor_phone || "-"} />
        </div>

        {(plan.payment_link || plan.bank_info) && (
          <div className="mt-2 space-y-1">
            {plan.payment_link && (
              <div className={cn("flex items-center gap-1.5 text-xs", dm ? "text-indigo-400" : "text-indigo-600")}>
                <Link className="w-3 h-3 shrink-0" />
                <a href={plan.payment_link} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{plan.payment_link}</a>
              </div>
            )}
            {plan.bank_info && (
              <div className={cn("flex items-start gap-1.5 text-xs", dm ? "text-slate-400" : "text-slate-500")}>
                <CreditCard className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap">{plan.bank_info}</span>
              </div>
            )}
          </div>
        )}

        {plan.notes && (
          <div className={cn("mt-2 flex items-start gap-1.5 text-xs", dm ? "text-slate-400" : "text-slate-500")}>
            <FileText className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap">{plan.notes}</span>
          </div>
        )}
      </div>

      {/* Installments */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <p className={cn("text-xs font-semibold uppercase tracking-wider mb-1", dm ? "text-slate-500" : "text-slate-400")}>Cuotas</p>
        {plan.installments.map(inst => (
          <InstallmentRow
            key={inst.id}
            inst={inst}
            dm={dm}
            onMarkPaid={onMarkPaid}
            onMarkUnpaid={onMarkUnpaid}
          />
        ))}
      </div>
    </div>
  );
}

function InfoChip({ dm, icon, label, value }: { dm: boolean; icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={cn("rounded-lg px-2.5 py-2 border text-xs", dm ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
      <div className={cn("flex items-center gap-1 mb-0.5", dm ? "text-slate-500" : "text-slate-400")}>
        {icon}
        <span>{label}</span>
      </div>
      <p className={cn("font-medium truncate", dm ? "text-white" : "text-slate-900")}>{value}</p>
    </div>
  );
}

function InstallmentRow({ inst, dm, onMarkPaid, onMarkUnpaid }: {
  inst: Installment;
  dm: boolean;
  onMarkPaid: (id: number) => void;
  onMarkUnpaid: (id: number) => void;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-3",
      dm ? "bg-slate-800/50 border-slate-700" : "bg-white border-slate-200",
      inst.status === "overdue" && (dm ? "border-red-500/30" : "border-red-200"),
      inst.status === "paid" && "opacity-70"
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
            inst.status === "paid" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" :
            inst.status === "overdue" ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" :
            "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
          )}>
            {inst.installment_number}
          </span>
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold", dm ? "text-white" : "text-slate-900")}>${fmtAmount(inst.amount)}</p>
            <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-400")}>Vence: {fmtDate(inst.due_date)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <InstallmentBadge status={inst.status} />
          {inst.status !== "paid" ? (
            <button
              onClick={() => onMarkPaid(inst.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              Marcar pagada
            </button>
          ) : (
            <button
              onClick={() => onMarkUnpaid(inst.id)}
              className={cn("px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                dm ? "border-slate-600 text-slate-400 hover:bg-slate-700" : "border-slate-200 text-slate-500 hover:bg-slate-50")}
            >
              Desmarcar
            </button>
          )}
        </div>
      </div>

      {/* Sent messages badges */}
      {inst.sentMessages && inst.sentMessages.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-700">
          {inst.sentMessages.map(m => (
            <span key={m.id} className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full border",
              dm ? "bg-slate-700 border-slate-600 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"
            )}>
              {MSG_LABELS[m.message_type] || m.message_type}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ plans, dm }: { plans: Plan[]; dm: boolean }) {
  const total = plans.length;
  const active = plans.filter(p => p.status === "active").length;
  const allInstallments = plans.flatMap(p => p.installments);
  const pending = allInstallments.filter(i => i.status === "pending").length;
  const overdue = allInstallments.filter(i => i.status === "overdue").length;

  const stats = [
    { label: "Total planes", value: total, color: "text-indigo-500" },
    { label: "Activos", value: active, color: "text-emerald-500" },
    { label: "Cuotas pendientes", value: pending, color: "text-yellow-500" },
    { label: "Cuotas vencidas", value: overdue, color: "text-red-500" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {stats.map(s => (
        <div key={s.label} className={cn("rounded-xl border p-4", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          <p className={cn("text-xs font-medium mb-1", dm ? "text-slate-500" : "text-slate-500")}>{s.label}</p>
          <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Collections() {
  const [dm, setDm] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<Plan | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Theme sync
  useEffect(() => {
    const syncTheme = () => {
      setDm(localStorage.getItem("theme") === "dark" || document.documentElement.classList.contains("dark"));
    };
    syncTheme();
    window.addEventListener("storage", syncTheme);
    const obs = new MutationObserver(syncTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const iv = setInterval(syncTheme, 300);
    return () => { window.removeEventListener("storage", syncTheme); obs.disconnect(); clearInterval(iv); };
  }, []);

  // Load data
  const loadPlans = useCallback(async () => {
    try {
      const data = await api.getCollections();
      setPlans(data);
    } catch (err) {
      console.error("Error loading collections:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      api.getCollections(),
      api.getLeads(),
    ]).then(([collectionsData, leadsData]) => {
      setPlans(collectionsData);
      setLeads(leadsData);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Load selected plan detail
  useEffect(() => {
    if (selectedPlanId === null) { setSelectedPlanDetail(null); return; }
    api.getCollection(selectedPlanId).then(setSelectedPlanDetail).catch(console.error);
  }, [selectedPlanId]);

  const handleMarkPaid = async (installmentId: number) => {
    try {
      await api.markInstallmentPaid(installmentId);
      if (selectedPlanId !== null) {
        const updated = await api.getCollection(selectedPlanId);
        setSelectedPlanDetail(updated);
        setPlans(prev => prev.map(p => p.id === selectedPlanId ? { ...updated, nextDue: updated.installments.find((i: Installment) => i.status !== "paid")?.due_date || null } : p));
      }
      showToast("Cuota marcada como pagada", true);
    } catch (err: any) {
      showToast(err.message || "Error al marcar la cuota", false);
    }
  };

  const handleMarkUnpaid = async (installmentId: number) => {
    try {
      await api.markInstallmentUnpaid(installmentId);
      if (selectedPlanId !== null) {
        const updated = await api.getCollection(selectedPlanId);
        setSelectedPlanDetail(updated);
        setPlans(prev => prev.map(p => p.id === selectedPlanId ? { ...updated, nextDue: updated.installments.find((i: Installment) => i.status !== "paid")?.due_date || null } : p));
      }
      showToast("Cuota desmarcada", true);
    } catch (err: any) {
      showToast(err.message || "Error", false);
    }
  };

  const handleDelete = async (planId: number) => {
    if (!confirm("¿Eliminar este plan de cobranza? Esta acción no se puede deshacer.")) return;
    try {
      await api.deleteCollection(planId);
      setPlans(prev => prev.filter(p => p.id !== planId));
      if (selectedPlanId === planId) { setSelectedPlanId(null); setSelectedPlanDetail(null); }
      showToast("Plan eliminado", true);
    } catch (err: any) {
      showToast(err.message || "Error al eliminar", false);
    }
  };

  const handleRunScheduler = async () => {
    setRunningScheduler(true);
    try {
      await api.runCollectionScheduler();
      await loadPlans();
      if (selectedPlanId !== null) {
        const updated = await api.getCollection(selectedPlanId);
        setSelectedPlanDetail(updated);
      }
      showToast("Scheduler ejecutado correctamente", true);
    } catch (err: any) {
      showToast(err.message || "Error al ejecutar el scheduler", false);
    } finally {
      setRunningScheduler(false);
    }
  };

  const handleCreate = async (plan: Plan) => {
    setPlans(prev => [plan, ...prev]);
    setSelectedPlanId(plan.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border",
          toast.ok
            ? dm ? "bg-emerald-900/80 border-emerald-700 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
            : dm ? "bg-red-900/80 border-red-700 text-red-300" : "bg-red-50 border-red-200 text-red-800"
        )}>
          {toast.msg}
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={cn("text-2xl font-bold", dm ? "text-white" : "text-slate-900")}>Cobranza Automatizada</h1>
          <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>Gestión de planes de pago y recordatorios automáticos por WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunScheduler}
            disabled={runningScheduler}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all",
              dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100"
            )}
          >
            {runningScheduler
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <PlayCircle className="w-4 h-4" />}
            Ejecutar ahora
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva Cobranza
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsBar plans={plans} dm={dm} />

      {/* Main content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Plans table */}
        <div className={cn("flex-1 rounded-xl border overflow-hidden flex flex-col", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          {/* Table header */}
          <div className={cn("grid gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b", dm ? "text-slate-500 border-slate-800 bg-slate-800/50" : "text-slate-500 border-slate-200 bg-slate-50")}
            style={{ gridTemplateColumns: "1fr 1fr auto 100px 80px 90px 80px" }}>
            <span>Nombre</span>
            <span>Deudor</span>
            <span>Teléfono</span>
            <span>Total</span>
            <span>Prog.</span>
            <span>Próx. vence</span>
            <span>Estado</span>
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto">
            {plans.length === 0 ? (
              <div className={cn("flex flex-col items-center justify-center py-16 text-center", dm ? "text-slate-500" : "text-slate-400")}>
                <DollarSign className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Sin planes de cobranza</p>
                <p className="text-xs mt-1">Crea el primero con "+ Nueva Cobranza"</p>
              </div>
            ) : plans.map(plan => {
              const paidCount = plan.installments.filter(i => i.status === "paid").length;
              const total = plan.installments.length;
              const hasOverdue = plan.installments.some(i => i.status === "overdue");
              const isSelected = plan.id === selectedPlanId;

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(isSelected ? null : plan.id)}
                  className={cn(
                    "w-full grid gap-3 px-4 py-3 text-left border-b text-sm transition-colors items-center",
                    dm ? "border-slate-800 hover:bg-slate-800" : "border-slate-100 hover:bg-slate-50",
                    isSelected && (dm ? "bg-indigo-500/10 border-l-2 border-l-indigo-500" : "bg-indigo-50/60 border-l-2 border-l-indigo-500")
                  )}
                  style={{ gridTemplateColumns: "1fr 1fr auto 100px 80px 90px 80px" }}
                >
                  <span className={cn("font-medium truncate", dm ? "text-white" : "text-slate-900")}>{plan.name}</span>
                  <span className={cn("truncate", dm ? "text-slate-300" : "text-slate-700")}>{plan.debtor_name}</span>
                  <span className={cn("text-xs truncate", dm ? "text-slate-400" : "text-slate-500")}>{plan.debtor_phone || "-"}</span>
                  <span className={cn("font-medium", dm ? "text-slate-200" : "text-slate-800")}>${fmtAmount(plan.total_amount)}</span>
                  <span className={cn("text-xs font-semibold", paidCount === total ? "text-emerald-500" : hasOverdue ? "text-red-500" : dm ? "text-slate-300" : "text-slate-700")}>
                    {paidCount}/{total}
                  </span>
                  <span className={cn("text-xs", dm ? "text-slate-400" : "text-slate-500")}>{plan.nextDue ? fmtDate(plan.nextDue) : "-"}</span>
                  <div className="flex items-center gap-1">
                    <PlanStatusDot status={plan.status} />
                    <span className={cn("text-xs capitalize", dm ? "text-slate-400" : "text-slate-500")}>
                      {plan.status === "active" ? "Activo" : plan.status === "completed" ? "Completado" : "Pausado"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {selectedPlanDetail ? (
          <div className={cn("w-96 rounded-xl border flex flex-col overflow-hidden", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
            <PlanDetail
              plan={selectedPlanDetail}
              dm={dm}
              onMarkPaid={handleMarkPaid}
              onMarkUnpaid={handleMarkUnpaid}
              onDelete={handleDelete}
            />
          </div>
        ) : selectedPlanId !== null ? (
          <div className={cn("w-96 rounded-xl border flex items-center justify-center", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className={cn("w-96 rounded-xl border flex flex-col items-center justify-center gap-2", dm ? "bg-slate-900 border-slate-800 text-slate-600" : "bg-white border-slate-200 text-slate-400")}>
            <ChevronRight className="w-8 h-8 opacity-30" />
            <p className="text-sm">Selecciona un plan para ver el detalle</p>
          </div>
        )}
      </div>

      {/* New plan modal */}
      {showNewModal && (
        <NewPlanModal
          dm={dm}
          leads={leads}
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreate}
        />
      )}

    </div>
  );
}
