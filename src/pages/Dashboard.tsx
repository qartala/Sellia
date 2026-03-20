import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import {
  Users,
  MessageCircle,
  TrendingUp,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BrainCircuit,
  Target,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Trash2,
  X,
  Calendar,
  Bot,
  UserCheck
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { cn } from "@/lib/utils";

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

const data = [
  { name: "Lun", conv: 400, leads: 240, conv_rate: 60 },
  { name: "Mar", conv: 300, leads: 139, conv_rate: 46 },
  { name: "Mié", conv: 200, leads: 980, conv_rate: 80 },
  { name: "Jue", conv: 278, leads: 390, conv_rate: 55 },
  { name: "Vie", conv: 189, leads: 480, conv_rate: 70 },
  { name: "Sáb", conv: 239, leads: 380, conv_rate: 65 },
  { name: "Dom", conv: 349, leads: 430, conv_rate: 75 },
];

function StatCard({ title, value, change, trend, icon: Icon, onClick, darkMode }: any) {
  const isPositive = trend === "up";
  const hasChange = change !== "0%" && change !== "-";

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-6 rounded-xl border shadow-sm cursor-pointer transition-all",
        darkMode
          ? "bg-slate-900 border-slate-800 hover:border-indigo-500/40 hover:shadow-lg"
          : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            darkMode ? "bg-indigo-500/15 text-indigo-300" : "bg-indigo-50 text-indigo-600"
          )}
        >
          <Icon className="w-5 h-5" />
        </div>

        {hasChange ? (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {change}
          </div>
        ) : (
          <div className={cn("text-sm font-medium", darkMode ? "text-slate-500" : "text-slate-400")}>-</div>
        )}
      </div>

      <div>
        <h3 className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>
          {title}
        </h3>
        <div className={cn("text-2xl font-bold mt-1", darkMode ? "text-white" : "text-slate-900")}>
          {value}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [allChats, setAllChats] = useState<any[]>([]);
  const [allAutomations, setAllAutomations] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [channelChartData, setChannelChartData] = useState<{ name: string; value: number }[]>([{ name: "Sin datos", value: 1 }]);
  const [darkMode, setDarkMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState("Últimos 7 días");

  const [stats, setStats] = useState({
    activeChats: 0,
    resolvedByAI: 0,
    handedToHuman: 0,
    conversionRate: "0.0",
    automations: 0,
    wonLeads: 0,
    totalLeads: 0
  });

  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  const [insights, setInsights] = useState({
    demographics: "Cargando datos...",
    interests: ["-", "-"],
    painPoints: ["-", "-"],
    needs: ["-", "-"],
    opportunities: ["-", "-"],
    buyingIntent: "Media",
    platformParams: {
      meta: "-",
      google: "-",
      linkedin: "-"
    }
  });

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

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [dashData, leadsData, autoData] = await Promise.all([
        api.getDashboardStats(),
        api.getLeads(),
        api.getAutomations(),
      ]);
      setStats(dashData.stats);
      setRecentLeads(dashData.recentLeads || []);
      if (dashData.insights) setInsights(dashData.insights);
      if (dashData.chartData) setAllChats(dashData.chartData);
      if (dashData.channelData) setChannelChartData(dashData.channelData);
      setLeads(leadsData);
      setAllAutomations(autoData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExportReport = () => {
    const rows = [
      ['Métrica', 'Valor'],
      ['Total Leads', stats.totalLeads],
      ['Resueltos por IA', stats.resolvedByAI],
      ['Derivados a Humano', stats.handedToHuman],
      ['Tasa de Conversión (%)', stats.conversionRate],
      ['Leads Ganados', stats.wonLeads],
      ['Automatizaciones', stats.automations],
      [],
      ['Lead', 'Canal', 'Score', 'Estado'],
      ...recentLeads.map(l => [l.name, l.channel, l.score, l.status]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sellia-reporte-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chartData = useMemo(() => {
    // If allChats comes from the API as chart data, use it directly
    if (Array.isArray(allChats) && allChats.length > 0 && allChats[0]?.name) {
      return allChats;
    }
    return [
      { name: "Lun", conv: 0, leads: 0 },
      { name: "Mar", conv: 0, leads: 0 },
      { name: "Mié", conv: 0, leads: 0 },
      { name: "Jue", conv: 0, leads: 0 },
      { name: "Vie", conv: 0, leads: 0 },
      { name: "Sáb", conv: 0, leads: 0 },
      { name: "Dom", conv: 0, leads: 0 },
    ];
  }, [allChats]);

  const funnelData = [
    { name: "Tráfico (Visitas)", value: Math.floor((stats.totalLeads || 0) * 3.5) },
    { name: "Chats Iniciados", value: stats.totalLeads || 0 },
    { name: "Calificados por IA", value: stats.resolvedByAI || 0 },
    { name: "Ventas Cerradas", value: stats.wonLeads || 0 },
  ];


  const getChange = (value: number) => value > 0 ? `+${value * 5}%` : "0%";

  const chartGrid = darkMode ? "#334155" : "#e2e8f0";
  const chartText = darkMode ? "#94a3b8" : "#64748b";
  const chartTextStrong = darkMode ? "#cbd5e1" : "#475569";
  const tooltipStyle = {
    borderRadius: '8px',
    border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
    boxShadow: darkMode
      ? '0 4px 12px rgba(0,0,0,0.35)'
      : '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
    color: darkMode ? '#f8fafc' : '#0f172a'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className={cn("text-2xl font-bold", darkMode ? "text-white" : "text-slate-900")}>
            Panel de Control
          </h1>
          <p className={cn("mt-1", darkMode ? "text-slate-400" : "text-slate-500")}>
            Resumen de rendimiento y Sellia Insights en tiempo real.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={isRefreshing}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border disabled:opacity-60",
              darkMode
                ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing ? "animate-spin" : "")} />
            {isRefreshing ? "Actualizando..." : "Actualizar"}
          </button>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className={cn("h-4 w-4", darkMode ? "text-slate-500" : "text-slate-400")} />
            </div>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              className={cn(
                "text-sm font-medium rounded-lg pl-9 pr-8 py-2 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer transition-colors border",
                darkMode
                  ? "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <option>Hoy</option>
              <option>Ayer</option>
              <option>Últimos 7 días</option>
              <option>Últimos 30 días</option>
              <option>Este mes</option>
            </select>
          </div>

          <button
            onClick={handleExportReport}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Conversaciones Totales"
          value={stats.activeChats}
          change={getChange(stats.activeChats)}
          trend="up"
          icon={MessageCircle}
          onClick={() => setSelectedStat('chats')}
          darkMode={darkMode}
        />
        <StatCard
          title="Resueltas por IA"
          value={stats.resolvedByAI}
          change={getChange(stats.resolvedByAI)}
          trend="up"
          icon={Bot}
          onClick={() => setSelectedStat('resolved')}
          darkMode={darkMode}
        />
        <StatCard
          title="Derivadas a Humano"
          value={stats.handedToHuman}
          change={stats.handedToHuman > 0 ? "-12%" : "0%"}
          trend="down"
          icon={UserCheck}
          onClick={() => setSelectedStat('handed')}
          darkMode={darkMode}
        />
        <StatCard
          title="Tasa de Conversión (Ventas)"
          value={`${stats.conversionRate}%`}
          change={stats.wonLeads > 0 ? "+2.4%" : "0%"}
          trend="up"
          icon={TrendingUp}
          onClick={() => setSelectedStat('conversion')}
          darkMode={darkMode}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart */}
        <div
          className={cn(
            "lg:col-span-2 p-6 rounded-xl border shadow-sm",
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          )}
        >
          <h3 className={cn("text-lg font-semibold mb-6", darkMode ? "text-white" : "text-slate-900")}>
            Volumen de Interacciones
          </h3>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', color: chartText }}
                />
                <Area type="monotone" dataKey="leads" name="Total Leads" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                <Area type="monotone" dataKey="conv" name="Conversiones" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorConv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart */}
        <div
          className={cn(
            "p-6 rounded-xl border shadow-sm",
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          )}
        >
          <h3 className={cn("text-lg font-semibold mb-6", darkMode ? "text-white" : "text-slate-900")}>
            Canales de Adquisición
          </h3>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelChartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={leads.length === 0 ? (darkMode ? '#334155' : '#e2e8f0') : COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: chartText }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel Chart */}
        <div
          className={cn(
            "p-6 rounded-xl border shadow-sm",
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          )}
        >
          <h3 className={cn("text-lg font-semibold mb-6", darkMode ? "text-white" : "text-slate-900")}>
            Embudo de Conversión (IA)
          </h3>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={chartGrid} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: chartTextStrong, fontSize: 12, fontWeight: 500 }} width={120} />
                <Tooltip cursor={{ fill: darkMode ? '#1e293b' : '#f8fafc' }} contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Volumen" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={32}>
                  {funnelData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === 0 ? '#94a3b8' :
                          index === 1 ? '#8b5cf6' :
                            index === 2 ? '#3b82f6' : '#10b981'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Assistant Widget */}
        <div
          className={cn(
            "p-6 rounded-xl border shadow-sm flex flex-col",
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          )}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className={cn("text-lg font-semibold flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
              <BrainCircuit className="w-5 h-5 text-indigo-600" /> Asistente de Sellia
            </h3>

            <span
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
                darkMode
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-emerald-600 bg-emerald-50 border-emerald-100"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> En vivo
            </span>
          </div>

          <div className="flex-1 space-y-5">
            <div>
              <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>
                Oportunidades de Negocio
              </h4>
              <ul className="space-y-2">
                {(insights.opportunities || []).map((opp, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-start gap-2 text-sm p-2.5 rounded-lg border",
                      darkMode
                        ? "text-slate-200 bg-emerald-500/10 border-emerald-500/20"
                        : "text-slate-700 bg-emerald-50/50 border-emerald-100"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>
                  Puntos de Dolor
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(insights.painPoints || []).map((point, i) => (
                    <span
                      key={i}
                      className={cn(
                        "px-2 py-1 rounded text-[11px] font-medium border",
                        darkMode
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                          : "bg-rose-50 text-rose-700 border-rose-100"
                      )}
                    >
                      {point}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>
                  Necesidades
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(insights.needs || []).map((need, i) => (
                    <span
                      key={i}
                      className={cn(
                        "px-2 py-1 rounded text-[11px] font-medium border",
                        darkMode
                          ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                          : "bg-blue-50 text-blue-700 border-blue-100"
                      )}
                    >
                      {need}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lookalike Audience Widget */}
        <div
          className={cn(
            "p-6 rounded-xl border shadow-sm flex flex-col",
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          )}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className={cn("text-lg font-semibold flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
              <Target className="w-5 h-5 text-indigo-600" /> Audiencia Lookalike
            </h3>

            <div className="flex gap-2">
              <button
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  darkMode
                    ? "text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10"
                    : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                )}
                title="Exportar CSV"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  darkMode
                    ? "text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10"
                    : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                )}
                title="Sincronizar"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-1", darkMode ? "text-slate-500" : "text-slate-400")}>
                Demografía
              </h4>
              <p className={cn("text-sm font-medium", darkMode ? "text-slate-200" : "text-slate-800")}>
                {insights.demographics}
              </p>
            </div>

            <div className="space-y-3">
              <div
                className={cn(
                  "rounded-lg p-3 border",
                  darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className={cn("text-xs font-bold", darkMode ? "text-slate-400" : "text-slate-500")}>
                    Meta Ads (Facebook/Instagram)
                  </div>
                  <button className="text-[10px] text-indigo-600 font-medium hover:underline">Copiar</button>
                </div>
                <div className={cn("text-sm font-medium", darkMode ? "text-slate-200" : "text-slate-800")}>
                  {insights.platformParams?.meta || '—'}
                </div>
              </div>

              <div
                className={cn(
                  "rounded-lg p-3 border",
                  darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className={cn("text-xs font-bold", darkMode ? "text-slate-400" : "text-slate-500")}>
                    Google Ads
                  </div>
                  <button className="text-[10px] text-indigo-600 font-medium hover:underline">Copiar</button>
                </div>
                <div className={cn("text-sm font-medium", darkMode ? "text-slate-200" : "text-slate-800")}>
                  {insights.platformParams?.google || '—'}
                </div>
              </div>

              <div
                className={cn(
                  "rounded-lg p-3 border",
                  darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className={cn("text-xs font-bold", darkMode ? "text-slate-400" : "text-slate-500")}>
                    LinkedIn Ads
                  </div>
                  <button className="text-[10px] text-indigo-600 font-medium hover:underline">Copiar</button>
                </div>
                <div className={cn("text-sm font-medium", darkMode ? "text-slate-200" : "text-slate-800")}>
                  {insights.platformParams?.linkedin || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border shadow-sm overflow-hidden",
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}
      >
        <div
          className={cn(
            "px-6 py-5 border-b flex justify-between items-center",
            darkMode ? "border-slate-800" : "border-slate-200"
          )}
        >
          <h3 className={cn("text-lg font-semibold", darkMode ? "text-white" : "text-slate-900")}>
            Leads Recientes
          </h3>
          <button onClick={() => navigate('/chats')} className="text-sm text-indigo-600 font-medium hover:underline">Ver todos</button>
        </div>

        <div className="overflow-x-auto">
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
                <th className="px-6 py-3 font-medium">Lead</th>
                <th className="px-6 py-3 font-medium">Canal</th>
                <th className="px-6 py-3 font-medium">Score</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Última Interacción</th>
              </tr>
            </thead>

            <tbody className={cn(darkMode ? "divide-y divide-slate-800" : "divide-y divide-slate-200")}>
              {recentLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className={cn("px-6 py-8 text-center", darkMode ? "text-slate-400" : "text-slate-500")}>
                    No hay leads recientes. Ve a Leads para agregar uno.
                  </td>
                </tr>
              ) : (
                recentLeads.map((lead, i) => (
                  <tr
                    key={i}
                    className={cn(
                      "transition-colors",
                      darkMode ? "hover:bg-slate-800/70" : "hover:bg-slate-50"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className={cn("font-medium", darkMode ? "text-white" : "text-slate-900")}>
                        {lead.name}
                      </div>
                      <div className={cn(darkMode ? "text-slate-400" : "text-slate-500")}>
                        {lead.company}
                      </div>
                    </td>

                    <td className={cn("px-6 py-4", darkMode ? "text-slate-300" : "text-slate-700")}>
                      {lead.channel}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-full rounded-full h-1.5 max-w-[60px]", darkMode ? "bg-slate-700" : "bg-slate-200")}>
                          <div
                            className={`h-1.5 rounded-full ${lead.score > 80 ? 'bg-emerald-500' : lead.score > 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${lead.score}%` }}
                          ></div>
                        </div>
                        <span className={cn("font-medium", darkMode ? "text-slate-300" : "text-slate-700")}>
                          {lead.score}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${lead.status === 'Cerrado Ganado' ? 'bg-emerald-100 text-emerald-700' :
                          lead.status === 'En Negociación' ? 'bg-purple-100 text-purple-700' :
                            lead.status === 'Calificado' ? 'bg-amber-100 text-amber-700' :
                              lead.status === 'Cerrado Perdido' ? 'bg-rose-100 text-rose-700' :
                                'bg-blue-100 text-blue-700'
                        }`}>
                        {lead.status}
                      </span>
                    </td>

                    <td className={cn("px-6 py-4", darkMode ? "text-slate-400" : "text-slate-500")}>
                      Reciente
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStat && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={cn(
              "rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl border",
              darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
            )}
          >
            <div
              className={cn(
                "px-6 py-4 border-b flex justify-between items-center",
                darkMode ? "border-slate-800" : "border-slate-200"
              )}
            >
              <h3 className={cn("text-lg font-bold", darkMode ? "text-white" : "text-slate-900")}>
                {selectedStat === 'chats' && "Desglose de Conversaciones"}
                {selectedStat === 'resolved' && "Resueltas por IA"}
                {selectedStat === 'handed' && "Derivadas a Humano"}
                {selectedStat === 'conversion' && "Análisis de Conversión"}
              </h3>

              <button
                onClick={() => setSelectedStat(null)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  darkMode
                    ? "text-slate-400 hover:bg-slate-800"
                    : "text-slate-400 hover:bg-slate-100"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {selectedStat === 'chats' && (
                <div className="space-y-4">
                  {leads.length === 0 ? (
                    <p className={cn(darkMode ? "text-slate-400" : "text-slate-500")}>
                      No hay conversaciones.
                    </p>
                  ) : leads.map(chat => (
                    <div
                      key={chat.id}
                      className={cn(
                        "flex justify-between items-center p-3 rounded-lg border",
                        darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div>
                        <div className={cn("font-medium", darkMode ? "text-white" : "text-slate-900")}>
                          {chat.name}
                        </div>
                        <div className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>
                          {chat.company} • {chat.channel}
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full",
                        darkMode ? "bg-slate-700 text-slate-200" : "bg-slate-200"
                      )}>
                        {chat.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {selectedStat === 'resolved' && (
                <div className="space-y-4">
                  {leads.filter(c => c.status === 'Calificado' || c.status === 'Cerrado Ganado' || c.status === 'Cerrado Perdido').length === 0 ?
                    <p className={cn(darkMode ? "text-slate-400" : "text-slate-500")}>
                      No hay conversaciones resueltas por IA.
                    </p> :
                    leads.filter(c => c.status === 'Calificado' || c.status === 'Cerrado Ganado' || c.status === 'Cerrado Perdido').map(chat => (
                      <div
                        key={chat.id}
                        className={cn(
                          "flex justify-between items-center p-3 rounded-lg border",
                          darkMode ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100"
                        )}
                      >
                        <div>
                          <div className={cn("font-medium", darkMode ? "text-white" : "text-slate-900")}>
                            {chat.name}
                          </div>
                          <div className={cn("text-xs", darkMode ? "text-indigo-300" : "text-indigo-600")}>
                            Score: {chat.score}
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          darkMode ? "bg-indigo-500/20 text-indigo-200" : "bg-indigo-200 text-indigo-800"
                        )}>
                          {chat.status}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {selectedStat === 'handed' && (
                <div className="space-y-4">
                  {leads.filter(c => c.status === 'En Negociación' || c.status === 'Nuevo').length === 0 ?
                    <p className={cn(darkMode ? "text-slate-400" : "text-slate-500")}>
                      No hay conversaciones derivadas a humanos.
                    </p> :
                    leads.filter(c => c.status === 'En Negociación' || c.status === 'Nuevo').map(chat => (
                      <div
                        key={chat.id}
                        className={cn(
                          "flex justify-between items-center p-3 rounded-lg border",
                          darkMode ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-100"
                        )}
                      >
                        <div>
                          <div className={cn("font-medium", darkMode ? "text-white" : "text-slate-900")}>
                            {chat.name}
                          </div>
                          <div className={cn("text-xs", darkMode ? "text-amber-300" : "text-amber-600")}>
                            Requiere atención
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          darkMode ? "bg-amber-500/20 text-amber-200" : "bg-amber-200 text-amber-800"
                        )}>
                          {chat.status}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {selectedStat === 'conversion' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={cn(
                        "p-4 rounded-xl border text-center",
                        darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className={cn("text-3xl font-bold", darkMode ? "text-white" : "text-slate-900")}>
                        {stats.totalLeads}
                      </div>
                      <div className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>
                        Total Leads
                      </div>
                    </div>

                    <div
                      className={cn(
                        "p-4 rounded-xl border text-center",
                        darkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
                      )}
                    >
                      <div className="text-3xl font-bold text-emerald-600">
                        {stats.wonLeads}
                      </div>
                      <div className={cn("text-sm font-medium", darkMode ? "text-emerald-300" : "text-emerald-600")}>
                        Cerrados Ganados
                      </div>
                    </div>
                  </div>

                  <div className={cn("h-4 rounded-full overflow-hidden flex", darkMode ? "bg-slate-800" : "bg-slate-100")}>
                    <div className="bg-emerald-500 h-full" style={{ width: `${stats.conversionRate}%` }}></div>
                  </div>

                  <p className={cn("text-center text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>
                    Tasa de conversión actual: {stats.conversionRate}%
                  </p>
                </div>
              )}

              {selectedStat === 'automations' && (
                <div className="space-y-4">
                  {allAutomations.length === 0 ? (
                    <p className={cn(darkMode ? "text-slate-400" : "text-slate-500")}>
                      No hay automatizaciones.
                    </p>
                  ) : allAutomations.map(auto => (
                    <div
                      key={auto.id}
                      className={cn(
                        "flex justify-between items-center p-3 rounded-lg border",
                        darkMode ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        <div className={cn("font-medium", darkMode ? "text-indigo-100" : "text-indigo-900")}>
                          {auto.name}
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full",
                        darkMode ? "bg-indigo-500/20 text-indigo-200" : "bg-indigo-200 text-indigo-800"
                      )}>
                        {auto.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}