import { useState, useEffect } from "react";
import { Plus, Play, Settings, MessageSquare, Zap, Database, ArrowRight, Trash2, X, Terminal } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

export default function Flows() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [execLog, setExecLog] = useState<{ name: string; log: string[] } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    api.getAutomations().then(setAutomations).catch(console.error);
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const isDark =
        localStorage.getItem("theme") === "dark" ||
        document.documentElement.classList.contains("dark");
      setDarkMode(isDark);
    };

    syncTheme();

    window.addEventListener("storage", syncTheme);

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const interval = setInterval(syncTheme, 300);

    return () => {
      window.removeEventListener("storage", syncTheme);
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleAddTemplate = async (templateName: string) => {
    try {
      const newAuto = await api.createAutomation({ name: templateName, status: 'Activo' });
      setAutomations([newAuto, ...automations]);
    } catch (err) {
      console.error('Error creating automation:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteAutomation(id);
      setAutomations(automations.filter((a: any) => a.id !== id));
    } catch (err) {
      console.error('Error deleting automation:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await api.deleteAllAutomations();
      setAutomations([]);
    } catch (err) {
      console.error('Error clearing automations:', err);
    }
  };

  const handleRunAutomation = async (id: number) => {
    setRunningId(id);
    const flow = automations.find((a: any) => a.id === id);
    try {
      const result = await api.runAutomation(id);
      if (result.success) {
        setAutomations(automations.map((a: any) => a.id === id ? result.automation : a));
        setExecLog({ name: flow?.name || 'Automatización', log: result.executionLog || [`✅ Ejecutada correctamente (${result.automation.runs} ejecuciones totales)`] });
      }
    } catch (err: any) {
      showToast(err.message || 'Error al ejecutar la automatización', false);
    } finally {
      setRunningId(null);
    }
  };

  const handleToggleStatus = async (flow: any) => {
    const newStatus = flow.status === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      await api.updateAutomation(flow.id, { status: newStatus });
      setAutomations(automations.map((a: any) => a.id === flow.id ? { ...a, status: newStatus } : a));
    } catch (err) {
      console.error('Error toggling automation status:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className={cn("text-2xl font-bold", darkMode ? "text-white" : "text-slate-900")}>
            Automatizaciones
          </h1>
          <p className={cn("mt-1", darkMode ? "text-slate-400" : "text-slate-500")}>
            Orquesta procesos y conecta herramientas sin escribir código.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClearAll}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border",
              darkMode
                ? "bg-slate-900 border-slate-700 text-rose-400 hover:bg-rose-500/10"
                : "bg-white border-slate-200 text-rose-600 hover:bg-rose-50"
            )}
          >
            <Trash2 className="w-4 h-4" /> Borrar Todo
          </button>

          <Link
            to="/flows/builder"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nueva Automatización
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Templates */}
        <div className="col-span-1 md:col-span-3">
          <h2 className={cn("text-sm font-semibold uppercase tracking-wider mb-4", darkMode ? "text-slate-300" : "text-slate-900")}>
            Plantillas Recomendadas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Calificación de Leads B2B", desc: "Pregunta tamaño de empresa y presupuesto, luego envía a HubSpot.", icon: MessageSquare, color: "bg-blue-50 text-blue-600", darkColor: "bg-blue-500/10 text-blue-300" },
              { title: "Recuperación de Carrito", desc: "Envía un mensaje de WhatsApp 1h después de abandono con descuento.", icon: Zap, color: "bg-amber-50 text-amber-600", darkColor: "bg-amber-500/10 text-amber-300" },
              { title: "Agendamiento Automático", desc: "Sincroniza con Google Calendar y envía recordatorios por SMS.", icon: Database, color: "bg-emerald-50 text-emerald-600", darkColor: "bg-emerald-500/10 text-emerald-300" },
            ].map((tpl, i) => (
              <div
                key={i}
                onClick={() => handleAddTemplate(tpl.title)}
                className={cn(
                  "p-5 rounded-xl border shadow-sm transition-all cursor-pointer group",
                  darkMode
                    ? "bg-slate-900 border-slate-800 hover:border-indigo-500/40 hover:shadow-lg"
                    : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md"
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4", darkMode ? tpl.darkColor : tpl.color)}>
                  <tpl.icon className="w-5 h-5" />
                </div>

                <h3 className={cn(
                  "font-semibold mb-1 transition-colors",
                  darkMode ? "text-white group-hover:text-indigo-300" : "text-slate-900 group-hover:text-indigo-600"
                )}>
                  {tpl.title}
                </h3>

                <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>
                  {tpl.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Active Flows */}
        <div className="col-span-1 md:col-span-3 mt-4">
          <h2 className={cn("text-sm font-semibold uppercase tracking-wider mb-4", darkMode ? "text-slate-300" : "text-slate-900")}>
            Tus Automatizaciones
          </h2>

          <div
            className={cn(
              "rounded-xl border shadow-sm overflow-hidden",
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            )}
          >
            <table className="w-full text-sm text-left">
              <thead
                className={cn(
                  "text-xs uppercase border-b",
                  darkMode
                    ? "text-slate-400 bg-slate-800 border-slate-700"
                    : "text-slate-500 bg-slate-50 border-slate-200"
                )}
              >
                <tr>
                  <th className="px-6 py-4 font-medium">Nombre</th>
                  <th className="px-6 py-4 font-medium">Estado</th>
                  <th className="px-6 py-4 font-medium">Ejecuciones (30d)</th>
                  <th className="px-6 py-4 font-medium">Última edición</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className={cn(darkMode ? "divide-y divide-slate-800" : "divide-y divide-slate-200")}>
                {automations.map((flow: any) => (
                  <tr
                    key={flow.id}
                    className={cn(
                      "transition-colors",
                      darkMode ? "hover:bg-slate-800/70" : "hover:bg-slate-50"
                    )}
                  >
                    <td className="px-6 py-4">
                      <Link
                        to={`/flows/builder?id=${flow.id}`}
                        className={cn("font-medium hover:underline", darkMode ? "text-white hover:text-indigo-300" : "text-slate-900 hover:text-indigo-600")}
                      >
                        {flow.name}
                      </Link>
                      <div className={cn("text-xs mt-1 flex items-center gap-1", darkMode ? "text-slate-400" : "text-slate-500")}>
                        Trigger <ArrowRight className="w-3 h-3" /> IA <ArrowRight className="w-3 h-3" /> Acción
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${flow.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                        {flow.status}
                      </span>
                    </td>

                    <td className={cn("px-6 py-4", darkMode ? "text-slate-300" : "text-slate-700")}>
                      {flow.runs}
                    </td>

                    <td className={cn("px-6 py-4", darkMode ? "text-slate-400" : "text-slate-500")}>
                      {flow.created_at ? new Date(flow.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRunAutomation(flow.id)}
                          disabled={flow.status !== 'Activo' || runningId === flow.id}
                          title={flow.status !== 'Activo' ? 'Activa la automatización para ejecutarla' : 'Ejecutar ahora'}
                          className={cn(
                            "p-1.5 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                            darkMode
                              ? "text-slate-500 hover:text-indigo-300 hover:bg-slate-800"
                              : "text-slate-400 hover:text-indigo-600"
                          )}
                        >
                          {runningId === flow.id
                            ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            : <Play className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleToggleStatus(flow)}
                          title={flow.status === 'Activo' ? 'Pausar automatización' : 'Activar automatización'}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            flow.status === 'Activo'
                              ? darkMode ? "text-emerald-400 hover:bg-slate-800" : "text-emerald-600 hover:bg-emerald-50"
                              : darkMode ? "text-slate-500 hover:text-slate-200 hover:bg-slate-800" : "text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <Settings className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(flow.id)}
                          className={cn(
                            "p-1.5 rounded transition-colors",
                            darkMode
                              ? "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                              : "text-slate-400 hover:text-rose-600"
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {automations.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className={cn(
                        "px-6 py-10 text-center",
                        darkMode ? "text-slate-400" : "text-slate-500"
                      )}
                    >
                      No tienes automatizaciones creadas todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Execution Log Modal */}
      {execLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={cn(
            "rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border",
            darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
          )}>
            <div className={cn(
              "px-5 py-4 border-b flex items-center justify-between",
              darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn("p-1.5 rounded-lg", darkMode ? "bg-indigo-500/15 text-indigo-300" : "bg-indigo-100 text-indigo-700")}>
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <p className={cn("font-semibold text-sm", darkMode ? "text-white" : "text-slate-900")}>Log de Ejecución</p>
                  <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>{execLog.name}</p>
                </div>
              </div>
              <button
                onClick={() => setExecLog(null)}
                className={cn("p-1.5 rounded-lg transition-colors", darkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={cn("p-5 font-mono text-xs space-y-1.5 max-h-80 overflow-y-auto", darkMode ? "bg-slate-950" : "bg-slate-50")}>
              {execLog.log.map((line, i) => (
                <div key={i} className={cn(
                  "leading-relaxed",
                  line.startsWith('✅') ? darkMode ? "text-emerald-400" : "text-emerald-700"
                  : line.startsWith('⚠️') || line.startsWith('ℹ️') ? darkMode ? "text-amber-400" : "text-amber-700"
                  : line.startsWith('   ↳') ? darkMode ? "text-slate-400" : "text-slate-500"
                  : darkMode ? "text-slate-200" : "text-slate-700"
                )}>
                  {line}
                </div>
              ))}
            </div>
            <div className={cn("px-5 py-3 border-t flex justify-end", darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white")}>
              <button
                onClick={() => setExecLog(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl border text-sm font-medium flex items-center gap-3 transition-all",
          toast.ok
            ? darkMode ? "bg-emerald-900 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-800"
            : darkMode ? "bg-rose-900 border-rose-700 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-800"
        )}>
          <span>{toast.ok ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}