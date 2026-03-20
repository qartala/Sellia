import { useState, useRef, useEffect } from "react";
import { BarChart3, TrendingUp, Target, Users, ArrowUpRight, ArrowDownRight, Plus, Upload, Bell, AlertTriangle, CheckCircle2, FileImage, FileSpreadsheet, Trash2, MessageSquare, X } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import Markdown from "react-markdown";
import { addNotification } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";

// Note: campaign data is loaded dynamically from the backend

function MetricCard({ title, value, change, trend, subtitle, onClick, darkMode }: any) {
  const isPositive = trend === "up";
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-6 rounded-xl border shadow-sm",
        onClick ? "cursor-pointer transition-all" : "",
        darkMode
          ? onClick
            ? "bg-slate-900 border-slate-800 hover:shadow-md hover:border-indigo-500/30"
            : "bg-slate-900 border-slate-800"
          : onClick
            ? "bg-white border-slate-200 hover:shadow-md hover:border-indigo-200"
            : "bg-white border-slate-200"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>{title}</h3>
        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {change}
        </div>
      </div>
      <div className={cn("text-2xl font-bold", darkMode ? "text-white" : "text-slate-900")}>{value}</div>
      <div className={cn("text-xs mt-1", darkMode ? "text-slate-500" : "text-slate-400")}>{subtitle}</div>
    </div>
  );
}

export default function Ads() {
  const [uploading, setUploading] = useState(false);
  const [manualText, setManualText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<any[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareMetric, setCompareMetric] = useState('roas');
  const [selectedMetricHistory, setSelectedMetricHistory] = useState<{ title: string, key: string, format: string } | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '', platform: 'Meta Ads', spend: 0, reach: 0, clicks: 0, conversions: 0, revenue: 0, date: new Date().toISOString().split('T')[0]
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

  // Load data from API
  useEffect(() => {
    Promise.all([api.getCampaigns(), api.getAdAnalyses(), api.getAdAlerts()])
      .then(([campsData, analysesData, alertsData]) => {
        // Fallback robusto al recargar la página evitando undefined
        const safeCamps = Array.isArray(campsData) ? campsData.map(c => ({
          ...c,
          spend: Number(c.spend) || 0,
          revenue: Number(c.revenue) || 0,
          conversions: Number(c.conversions) || 0,
          clicks: Number(c.clicks) || 0,
          reach: Number(c.reach) || 0,
          roas: Number(c.roas) || 0,
          cpa: Number(c.cpa) || 0,
          ctr: Number(c.ctr) || 0
        })) : [];
        setCampaigns(safeCamps);
        
        setSavedAnalyses(Array.isArray(analysesData) ? analysesData : []);
        if (alertsData && Array.isArray(alertsData) && alertsData.length > 0) {
          setAlerts(alertsData);
        }
      }).catch(err => {
        console.error("Error al cargar datos del módulo Ads:", err);
        setCampaigns([]);
      });
  }, []);

  // Derived metrics and chart data
  const chartDataMap = campaigns.reduce((acc: any, camp: any) => {
    const date = camp.date;
    if (!acc[date]) acc[date] = { spend: 0, revenue: 0 };
    acc[date].spend += camp.spend;
    acc[date].revenue += camp.revenue;
    return acc;
  }, {});

  const performanceData = Object.keys(chartDataMap).sort().map(date => {
    const data = chartDataMap[date];
    const roas = data.spend > 0 ? data.revenue / data.spend : 0;
    const d = new Date(date + 'T12:00:00');
    const name = `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' })}`;
    return { name, roas: Number(roas.toFixed(2)), spend: data.spend, originalDate: date };
  }).slice(-14);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthCampaigns = campaigns.filter(c => {
    const d = new Date(c.date + 'T12:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const prevMonthCampaigns = campaigns.filter(c => {
    const d = new Date(c.date + 'T12:00:00');
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.updateCampaign(id as any, { status: newStatus });
      setCampaigns(campaigns.map((c: any) => c.id === id ? { ...c, status: newStatus } : c));
    } catch (error) {
      console.error("Error updating status", error);
    }
  };

  const calcMetrics = (camps: any[]) => {
    const spend = camps.reduce((acc, c) => acc + (Number(c.spend) || 0), 0);
    const revenue = camps.reduce((acc, c) => acc + (Number(c.revenue) || 0), 0);
    const conversions = camps.reduce((acc, c) => acc + (Number(c.conversions) || 0), 0);
    const clicks = camps.reduce((acc, c) => acc + (Number(c.clicks) || 0), 0);
    const reach = camps.reduce((acc, c) => acc + (Number(c.reach) || 0), 0);
    return {
      spend,
      revenue,
      conversions,
      roas: spend > 0 ? revenue / spend : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
      ctr: reach > 0 ? (clicks / reach) * 100 : 0
    };
  };

  const currentM = calcMetrics(currentMonthCampaigns);
  const prevM = calcMetrics(prevMonthCampaigns);
  const globalM = calcMetrics(campaigns);

  const ComparativeCell = ({ value, avg, isInverse = false, format = 'number', suffix = '' }: any) => {
    if (!avg || avg === 0) return (
      <span className={cn("font-medium", darkMode ? "text-white" : "text-slate-900")}>
        {format === 'money' ? '$' : ''}{value}{suffix}
      </span>
    );
    const diff = ((value - avg) / avg) * 100;
    const isPositive = isInverse ? diff < 0 : diff > 0;
    const trendColor = isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50';
    const displayDiff = diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;

    return (
      <div className="flex flex-col items-start">
        <span className={cn("font-medium", darkMode ? "text-white" : "text-slate-900")}>
          {format === 'money' ? '$' : ''}{value}{suffix}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 ${trendColor}`} title={`Promedio global: ${avg.toFixed(2)}`}>
          {displayDiff} vs prom
        </span>
      </div>
    );
  };

  const formatGrowth = (curr: number, prev: number, inverse = false) => {
    if (prev === 0) return curr > 0 ? { text: "+100%", trend: "up" } : { text: "0%", trend: "up" };
    const diff = ((curr - prev) / prev) * 100;
    const isPositive = diff > 0;
    const trend = (isPositive && !inverse) || (!isPositive && inverse) ? "up" : "down";
    return { text: `${isPositive ? '+' : ''}${diff.toFixed(1)}%`, trend };
  };

  const roasGrowth = formatGrowth(currentM.roas, prevM.roas);
  const spendGrowth = formatGrowth(currentM.spend, prevM.spend);
  const cpaGrowth = formatGrowth(currentM.cpa, prevM.cpa, true);
  const convGrowth = formatGrowth(currentM.conversions, prevM.conversions);

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const ctr = newCampaign.reach > 0 ? (newCampaign.clicks / newCampaign.reach) * 100 : 0;
    const cpa = newCampaign.conversions > 0 ? newCampaign.spend / newCampaign.conversions : 0;
    const roas = newCampaign.spend > 0 ? newCampaign.revenue / newCampaign.spend : 0;

    const campaignData = {
      name: newCampaign.name,
      platform: newCampaign.platform,
      status: 'Active',
      spend: Number(newCampaign.spend),
      revenue: Number(newCampaign.revenue),
      reach: Number(newCampaign.reach),
      clicks: Number(newCampaign.clicks),
      conversions: Number(newCampaign.conversions),
      date: newCampaign.date
    };

    try {
      const savedCampaign = await api.createCampaign(campaignData);
      setCampaigns([savedCampaign, ...campaigns]);

      setShowAddModal(false);
      setNewCampaign({ name: '', platform: 'Meta Ads', spend: 0, reach: 0, clicks: 0, conversions: 0, revenue: 0, date: new Date().toISOString().split('T')[0] });

      addNotification({
        type: 'success',
        title: 'Campaña Creada',
        message: `La campaña ${newCampaign.name} ha sido registrada.`
      });
    } catch (e) {
      console.error("Error creating campaign", e);
      alert("Error al guardar la campaña");
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await api.deleteCampaign(id);
      setCampaigns(campaigns.filter((c: any) => c.id !== id));
    } catch (error) {
      console.error("Error deleting campaign", error);
    }
  };

  const [savedAnalyses, setSavedAnalyses] = useState<any[]>([]);

  // (analyses loaded in initial useEffect above)

  const [alerts, setAlerts] = useState<any[]>([]);

  // (alerts loaded in initial useEffect above)

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    metric: 'CPA', condition: '>', value: '', severity: 'Normal'
  });

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const savedAlert = await api.createAdAlert({
        metric: newAlert.metric,
        condition: newAlert.condition,
        value: newAlert.value,
        severity: newAlert.severity
      });
      setAlerts([...alerts, savedAlert]);
      setShowAlertModal(false);
      setNewAlert({ metric: 'CPA', condition: '>', value: '', severity: 'Normal' });
      addNotification({
        type: 'success',
        title: 'Alerta Creada',
        message: `Regla para ${newAlert.metric} guardada correctamente.`
      });
    } catch (err) {
      console.error(err);
      alert('Error al guardar la regla.');
    }
  };

  const handleDeleteAlert = async (id: number) => {
    try {
      await api.deleteAdAlert(id);
      setAlerts(alerts.filter((a: any) => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };




  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64data = (reader.result as string).split(',')[1];
          const historicalData = campaigns.map((c: any) => ({
            nombre: c.name, plataforma: c.platform, inversion: c.spend,
            roas: c.roas, cpa: c.cpa, conversiones: c.conversions, fecha: c.date
          }));

          const result = await api.aiAnalyzeFile({
            base64Data: base64data,
            mimeType: file.type,
            historicalData: campaigns.length > 0 ? historicalData : []
          });

          if (result.analysis) {
             setSavedAnalyses(prev => [result.analysis, ...prev]);
          }

          if (result.extractedCampaigns && result.extractedCampaigns.length > 0) {
             const updatedCampaigns = await api.getCampaigns();
             setCampaigns(updatedCampaigns);
          }

          addNotification({
            type: 'success',
            title: 'Análisis Completado',
            message: `El análisis del archivo ${file.name} ha finalizado.`
          });
        } catch (apiError) {
          console.error("Error al procesar archivo en el servidor:", apiError);
          addNotification({ type: 'alert', title: 'Error', message: 'No se pudo analizar el archivo.' });
        } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing file:", error);
      setUploading(false);
    }
  };

  const handleManualAnalysis = async () => {
    if (!manualText.trim()) return;
    setUploading(true);
    try {
      const result = await api.aiAnalyzeAds({
        text: manualText,
        historicalData: campaigns.map((c: any) => ({
          nombre: c.name, plataforma: c.platform, inversion: c.spend,
          roas: c.roas, cpa: c.cpa, conversiones: c.conversions, fecha: c.date
        }))
      });

      if (result.analysis) {
        setSavedAnalyses([result.analysis, ...savedAnalyses]);
      }
      if (result.extractedCampaigns && result.extractedCampaigns.length > 0) {
        // Reload campaigns from API to get the newly inserted ones
        const updatedCampaigns = await api.getCampaigns();
        setCampaigns(updatedCampaigns);
      }
      setManualText("");
    } catch (error) {
      console.error("Error analyzing text:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAnalysis = async (id: number) => {
    try {
      await api.deleteAdAnalysis(id);
      setSavedAnalyses(savedAnalyses.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
  };

  const handleClearAll = async () => {
    try {
      await api.deleteAllAdAnalyses();
      setSavedAnalyses([]);
    } catch (err) { console.error(err); }
  };

  const chartGrid = darkMode ? "#334155" : "#e2e8f0";
  const chartText = darkMode ? "#94a3b8" : "#64748b";
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
          <div className="flex items-center gap-3 mb-1">
            <h1 className={cn("text-2xl font-bold", darkMode ? "text-white" : "text-slate-900")}>AnuncIA</h1>
            <span className="px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
              Plus
            </span>
          </div>
          <p className={cn(darkMode ? "text-slate-400" : "text-slate-500")}>
            Potencia tu chatbot atrayendo más tráfico calificado. Monitorea tus campañas y optimiza con IA.
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
            <Trash2 className="w-4 h-4" /> Borrar Análisis
          </button>
          <button 
            onClick={() => navigate('/settings/integrations')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Conectar Ad Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="ROAS (Mes Actual)" value={`${currentM.roas.toFixed(2)}x`} change={roasGrowth.text} trend={roasGrowth.trend} subtitle="vs mes anterior" onClick={() => setSelectedMetricHistory({ title: 'ROAS', key: 'roas', format: 'number' })} darkMode={darkMode} />
        <MetricCard title="Inversión (Mes Actual)" value={`$${currentM.spend.toLocaleString()}`} change={spendGrowth.text} trend={spendGrowth.trend} subtitle="vs mes anterior" onClick={() => setSelectedMetricHistory({ title: 'Inversión', key: 'spend', format: 'money' })} darkMode={darkMode} />
        <MetricCard title="CPA (Mes Actual)" value={`$${currentM.cpa.toFixed(2)}`} change={cpaGrowth.text} trend={cpaGrowth.trend} subtitle="vs mes anterior" onClick={() => setSelectedMetricHistory({ title: 'CPA', key: 'cpa', format: 'money' })} darkMode={darkMode} />
        <MetricCard title="Conversiones (Mes Actual)" value={currentM.conversions.toLocaleString()} change={convGrowth.text} trend={convGrowth.trend} subtitle="vs mes anterior" onClick={() => setSelectedMetricHistory({ title: 'Conversiones', key: 'conversions', format: 'number' })} darkMode={darkMode} />
      </div>

      {/* Campaigns Table */}
      <div className={cn("rounded-xl border shadow-sm overflow-hidden", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
        <div className={cn("px-6 py-5 border-b flex justify-between items-center", darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50")}>
          <h3 className={cn("text-lg font-semibold", darkMode ? "text-white" : "text-slate-900")}>Campañas Activas</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCompareModal(true)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border",
                darkMode
                  ? "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <TrendingUp className="w-4 h-4" /> Comparar Campañas
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nueva Campaña
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={cn("border-b", darkMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-white border-slate-200 text-slate-500")}>
              <tr>
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Campaña</th>
                <th className="px-6 py-3 font-medium">Plataforma</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Inversión</th>
                <th className="px-6 py-3 font-medium">ROAS</th>
                <th className="px-6 py-3 font-medium">CPA</th>
                <th className="px-6 py-3 font-medium">CTR</th>
                <th className="px-6 py-3 font-medium">Conversiones</th>
                <th className="px-6 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={cn(darkMode ? "divide-y divide-slate-800" : "divide-y divide-slate-100")}>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className={cn("px-6 py-8 text-center", darkMode ? "text-slate-400" : "text-slate-500")}>
                    No hay campañas registradas. Haz clic en "Nueva Campaña" para agregar una.
                  </td>
                </tr>
              ) : (
                campaigns.map((camp: any) => (
                  <tr key={camp.id} className={cn("transition-colors", darkMode ? "hover:bg-slate-800/70" : "hover:bg-slate-50")}>
                    <td className={cn("px-6 py-4 text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>{camp.date}</td>
                    <td className={cn("px-6 py-4 font-medium", darkMode ? "text-white" : "text-slate-900")}>
                      {camp.name}
                    </td>
                    <td className={cn("px-6 py-4", darkMode ? "text-slate-300" : "text-slate-600")}>{camp.platform}</td>
                    <td className="px-6 py-4">
                      <select
                        value={camp.status}
                        onChange={(e) => handleStatusChange(camp.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full outline-none cursor-pointer appearance-none ${camp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                            camp.status === 'Paused' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                          }`}
                      >
                        <option value="Active">Activa</option>
                        <option value="Paused">Pausada</option>
                        <option value="Terminada">Terminada</option>
                      </select>
                    </td>
                    <td className={cn("px-6 py-4", darkMode ? "text-white" : "text-slate-900")}>${camp.spend.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <ComparativeCell value={camp.roas} avg={globalM.roas} suffix="x" />
                    </td>
                    <td className="px-6 py-4">
                      <ComparativeCell value={camp.cpa} avg={globalM.cpa} isInverse={true} format="money" />
                    </td>
                    <td className="px-6 py-4">
                      <ComparativeCell value={camp.ctr} avg={globalM.ctr} suffix="%" />
                    </td>
                    <td className={cn("px-6 py-4", darkMode ? "text-white" : "text-slate-900")}>{camp.conversions}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteCampaign(camp.id)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          darkMode
                            ? "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                            : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        )}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className={cn("lg:col-span-2 p-6 rounded-xl border shadow-sm", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          <div className="flex justify-between items-center mb-6">
            <h3 className={cn("text-lg font-semibold", darkMode ? "text-white" : "text-slate-900")}>Rendimiento de Inversión vs ROAS</h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <span className={cn(darkMode ? "text-slate-300" : "text-slate-600")}>ROAS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", darkMode ? "bg-slate-500" : "bg-slate-300")}></div>
                <span className={cn(darkMode ? "text-slate-300" : "text-slate-600")}>Inversión</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 12 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line yAxisId="left" type="monotone" dataKey="roas" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="spend" stroke={darkMode ? "#64748b" : "#cbd5e1"} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts Configuration */}
        <div className={cn("p-6 rounded-xl border shadow-sm flex flex-col", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={cn("text-lg font-semibold flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
              <Bell className="w-5 h-5 text-indigo-600" /> Reglas y Alertas
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    const res = await api.evaluateAlerts();
                    addNotification({
                      type: res.count > 0 ? 'alert' : 'success',
                      title: 'Evaluación Completada',
                      message: res.count > 0 
                        ? `Se detectaron ${res.count} alertas en tus campañas actuales. Revisa tus notificaciones.`
                        : `Ninguna campaña actual rompe tus reglas configuradas.`
                    });
                  } catch (e) {
                      addNotification({ type: 'alert', title: 'Error', message: 'No se pudieron evaluar las alertas.' });
                  }
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-colors text-xs font-semibold uppercase",
                  darkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                )}
                title="Evaluar campañas actuales"
              >
                Evaluar
              </button>
              <button
                onClick={() => setShowAlertModal(true)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  darkMode ? "text-indigo-300 hover:bg-indigo-500/10" : "text-indigo-600 hover:bg-indigo-50"
                )}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className={cn("text-sm mb-4", darkMode ? "text-slate-400" : "text-slate-500")}>
            Recibe notificaciones automáticas cuando tus campañas superen los límites.
          </p>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className={cn("text-center py-4 text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>
                No hay alertas configuradas.
              </div>
            ) : (
              alerts.map((alert: any) => (
                <div key={alert.id} className={`p-3 rounded-lg border relative group ${alert.severity === 'Urgente' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <div className="flex justify-between items-start mb-1 pr-6">
                    <div className="flex items-center gap-2">
                      {alert.severity === 'Urgente' ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <Bell className="w-4 h-4 text-amber-600" />}
                      <span className="text-sm font-semibold text-slate-900">Si {alert.metric} {alert.condition} {alert.value}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${alert.severity === 'Urgente' ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">Notificar vía App y Email</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Analyzer */}
        <div className={cn("lg:col-span-1 p-6 rounded-xl border shadow-sm flex flex-col", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          <h3 className={cn("text-lg font-semibold mb-2 flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
            <Target className="w-5 h-5 text-indigo-600" /> Analizador con Sellia
          </h3>
          <p className={cn("text-sm mb-4", darkMode ? "text-slate-400" : "text-slate-500")}>Sube un reporte (CSV/JPG) o pega tus métricas manualmente para obtener recomendaciones.</p>

          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
                darkMode ? "border-slate-700 hover:bg-slate-800 hover:border-indigo-500/40" : "border-slate-300 hover:bg-slate-50 hover:border-indigo-300"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className={cn("w-6 h-6 mb-2", darkMode ? "text-slate-500" : "text-slate-400")} />
              <p className={cn("text-sm font-medium", darkMode ? "text-slate-200" : "text-slate-700")}>Subir reporte (CSV, JPG, PNG)</p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv, image/jpeg, image/png"
                onChange={handleFileUpload}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className={cn("w-full border-t", darkMode ? "border-slate-800" : "border-slate-200")}></div>
              </div>
              <div className="relative flex justify-center">
                <span className={cn("px-2 text-xs", darkMode ? "bg-slate-900 text-slate-400" : "bg-white text-slate-500")}>O ingreso manual</span>
              </div>
            </div>

            <div>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Ej: Gasté $500 en Meta Ads, obtuve 20 leads a $25 cada uno. ¿Cómo lo mejoro?"
                className={cn(
                  "w-full p-3 border rounded-lg text-sm outline-none resize-none h-24",
                  darkMode
                    ? "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    : "bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                )}
              />
              <button
                onClick={handleManualAnalysis}
                disabled={!manualText.trim() || uploading}
                className={cn(
                  "mt-2 w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50",
                  darkMode ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-slate-900 text-white hover:bg-slate-800"
                )}
              >
                Analizar Texto
              </button>
            </div>
          </div>

          {uploading && (
            <div className={cn("mt-6 p-4 rounded-lg flex items-center gap-3 border", darkMode ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-indigo-50 text-indigo-700 border-indigo-100")}>
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">La IA está analizando tus campañas...</span>
            </div>
          )}
        </div>

        {/* Saved Analyses */}
        <div className={cn("lg:col-span-2 rounded-xl border shadow-sm overflow-hidden flex flex-col", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          <div className={cn("px-6 py-5 border-b flex justify-between items-center", darkMode ? "border-slate-800" : "border-slate-200")}>
            <h3 className={cn("text-lg font-semibold", darkMode ? "text-white" : "text-slate-900")}>Historial de Análisis</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {savedAnalyses.length === 0 ? (
              <div className={cn("text-center py-10", darkMode ? "text-slate-400" : "text-slate-500")}>
                <MessageSquare className={cn("w-12 h-12 mx-auto mb-3", darkMode ? "text-slate-600" : "text-slate-300")} />
                <p>No hay análisis guardados.</p>
                <p className="text-sm">Usa el Analizador con IA para generar recomendaciones.</p>
              </div>
            ) : (
              savedAnalyses.map((analysis) => (
                <div key={analysis.id} className={cn("rounded-xl border p-5 relative group", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                  <button
                    onClick={() => handleDeleteAnalysis(analysis.id)}
                    className={cn(
                      "absolute top-4 right-4 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100",
                      darkMode
                        ? "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                        : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className={cn("font-bold", darkMode ? "text-white" : "text-slate-900")}>Recomendaciones de Sellia</h4>
                    <span className={cn("text-xs ml-auto mr-8", darkMode ? "text-slate-400" : "text-slate-500")}>{analysis.date} • {analysis.source}</span>
                  </div>
                  <div className={cn("markdown-body text-sm", darkMode ? "text-slate-200" : "text-slate-900")}>
                    <Markdown>{analysis.content}</Markdown>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Campaign Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className={cn("rounded-xl shadow-xl w-full max-w-lg overflow-hidden", darkMode ? "bg-slate-900 border border-slate-700" : "bg-white")}>
            <div className={cn("px-6 py-4 border-b flex justify-between items-center", darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50")}>
              <h3 className={cn("font-semibold", darkMode ? "text-white" : "text-slate-900")}>Agregar Nueva Campaña</h3>
              <button onClick={() => setShowAddModal(false)} className={cn(darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCampaign} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Fecha</label>
                  <input
                    type="date"
                    required
                    value={newCampaign.date}
                    onChange={e => setNewCampaign({ ...newCampaign, date: e.target.value })}
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Nombre de la campaña</label>
                  <input
                    type="text"
                    required
                    value={newCampaign.name}
                    onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                    placeholder="Ej: Retargeting Q2"
                  />
                </div>
                <div className="col-span-2">
                  <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Plataforma</label>
                  <select
                    value={newCampaign.platform}
                    onChange={e => setNewCampaign({ ...newCampaign, platform: e.target.value })}
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  >
                    <option value="Meta Ads">Meta Ads</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="LinkedIn Ads">LinkedIn Ads</option>
                    <option value="TikTok Ads">TikTok Ads</option>
                  </select>
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Inversión Total ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newCampaign.spend || ''}
                    onChange={e => setNewCampaign({ ...newCampaign, spend: Number(e.target.value) })}
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Ingresos Generados ($)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newCampaign.revenue || ''}
                    onChange={e => setNewCampaign({ ...newCampaign, revenue: Number(e.target.value) })}
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Alcance (Impresiones)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newCampaign.reach || ''}
                    onChange={e => setNewCampaign({ ...newCampaign, reach: Number(e.target.value) })}
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Clics</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newCampaign.clicks || ''}
                    onChange={e => setNewCampaign({ ...newCampaign, clicks: Number(e.target.value) })}
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Conversiones (Leads/Ventas)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newCampaign.conversions || ''}
                    onChange={e => setNewCampaign({ ...newCampaign, conversions: Number(e.target.value) })}
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  />
                </div>
              </div>
              <div className={cn("pt-4 border-t flex justify-end gap-3 mt-6", darkMode ? "border-slate-800" : "border-slate-200")}>
                <button type="button" onClick={() => setShowAddModal(false)} className={cn(
                  "px-4 py-2 border rounded-lg text-sm font-medium transition-colors",
                  darkMode
                    ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}>
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Guardar Campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className={cn("rounded-xl shadow-xl w-full max-w-md overflow-hidden", darkMode ? "bg-slate-900 border border-slate-700" : "bg-white")}>
            <div className={cn("px-6 py-4 border-b flex justify-between items-center", darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50")}>
              <h3 className={cn("font-semibold", darkMode ? "text-white" : "text-slate-900")}>Nueva Regla de Alerta</h3>
              <button onClick={() => setShowAlertModal(false)} className={cn(darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAlert} className="p-6 space-y-4">
              <div>
                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Métrica</label>
                <select
                  value={newAlert.metric}
                  onChange={e => setNewAlert({ ...newAlert, metric: e.target.value })}
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  )}
                >
                  <option value="CPA">CPA</option>
                  <option value="ROAS">ROAS</option>
                  <option value="Inversión">Inversión</option>
                  <option value="CTR">CTR</option>
                  <option value="Conversiones">Conversiones</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Condición</label>
                  <select
                    value={newAlert.condition}
                    onChange={e => setNewAlert({ ...newAlert, condition: e.target.value })}
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  >
                    <option value=">">Mayor a ({'>'})</option>
                    <option value="<">Menor a ({'<'})</option>
                    <option value="=">Igual a (=)</option>
                  </select>
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Valor</label>
                  <input
                    type="text"
                    required
                    value={newAlert.value}
                    onChange={e => setNewAlert({ ...newAlert, value: e.target.value })}
                    placeholder="Ej: 15, 2.0x"
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  />
                </div>
              </div>
              <div>
                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Severidad</label>
                <select
                  value={newAlert.severity}
                  onChange={e => setNewAlert({ ...newAlert, severity: e.target.value })}
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg text-sm outline-none",
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  )}
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>
              <div className={cn("pt-4 border-t flex justify-end gap-3 mt-6", darkMode ? "border-slate-800" : "border-slate-200")}>
                <button type="button" onClick={() => setShowAlertModal(false)} className={cn(
                  "px-4 py-2 border rounded-lg text-sm font-medium transition-colors",
                  darkMode
                    ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                )}>
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                  Guardar Regla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compare Campaigns Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className={cn("rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden", darkMode ? "bg-slate-900 border border-slate-700" : "bg-white")}>
            <div className={cn("px-6 py-4 border-b flex justify-between items-center", darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50")}>
              <h3 className={cn("font-semibold text-lg", darkMode ? "text-white" : "text-slate-900")}>
                Comparar Campañas
              </h3>
              <button onClick={() => setShowCompareModal(false)} className={cn(darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6 flex items-center gap-4">
                <label className={cn("text-sm font-medium", darkMode ? "text-slate-300" : "text-slate-700")}>Métrica a comparar:</label>
                <div className={cn("flex p-1 rounded-lg", darkMode ? "bg-slate-800" : "bg-slate-100")}>
                  {[
                    { id: 'roas', label: 'ROAS' },
                    { id: 'cpa', label: 'CPA' },
                    { id: 'spend', label: 'Inversión' },
                    { id: 'conversions', label: 'Conversiones' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setCompareMetric(m.id)}
                      className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                        compareMetric === m.id
                          ? darkMode
                            ? "bg-slate-900 text-indigo-300 shadow-sm"
                            : "bg-white text-indigo-600 shadow-sm"
                          : darkMode
                            ? "text-slate-400 hover:text-white"
                            : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const uniqueCampaigns = Array.from(new Set(campaigns.map(c => c.name)));
                const uniqueDates = Array.from(new Set(campaigns.map(c => c.date))).sort();

                if (uniqueCampaigns.length === 0 || uniqueDates.length === 0) return <p className={cn(darkMode ? "text-slate-400" : "text-slate-700")}>No hay datos suficientes para comparar.</p>;

                const chartData = uniqueDates.map(date => {
                  const dateObj = new Date(date + 'T12:00:00');
                  const dataPoint: any = {
                    name: `${dateObj.getDate()} ${dateObj.toLocaleString('es-ES', { month: 'short' })}`,
                    originalDate: date
                  };

                  uniqueCampaigns.forEach(campName => {
                    const campData = campaigns.find(c => c.name === campName && c.date === date);
                    if (campData) {
                      dataPoint[campName] = Number(campData[compareMetric]) || 0;
                    } else {
                      dataPoint[campName] = null;
                    }
                  });
                  return dataPoint;
                });

                const COLORS = ['#4f46e5', '#10b981', '#f43f5e', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6'];

                return (
                  <div className="space-y-6">
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 12 }} dy={10} />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: chartText, fontSize: 12 }}
                            dx={-10}
                            tickFormatter={(val) => compareMetric === 'spend' || compareMetric === 'cpa' ? `$${val}` : compareMetric === 'roas' ? `${val}x` : val}
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            formatter={(value: any, name: string) => [
                              compareMetric === 'spend' || compareMetric === 'cpa' ? `$${Number(value).toLocaleString()}` :
                                compareMetric === 'roas' ? `${value}x` : value,
                              name
                            ]}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px', color: chartText }} />
                          {uniqueCampaigns.map((campName, index) => (
                            <Line
                              key={campName}
                              type="monotone"
                              dataKey={campName}
                              name={campName}
                              stroke={COLORS[index % COLORS.length]}
                              strokeWidth={2}
                              dot={{ r: 4, strokeWidth: 2 }}
                              activeDot={{ r: 6 }}
                              connectNulls={true}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Metric History Modal */}
      {selectedMetricHistory && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className={cn("rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden", darkMode ? "bg-slate-900 border border-slate-700" : "bg-white")}>
            <div className={cn("px-6 py-4 border-b flex justify-between items-center", darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50")}>
              <h3 className={cn("font-semibold text-lg", darkMode ? "text-white" : "text-slate-900")}>
                Evolución Histórica: <span className="text-indigo-600">{selectedMetricHistory.title}</span>
              </h3>
              <button onClick={() => setSelectedMetricHistory(null)} className={cn(darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const dateMap = campaigns.reduce((acc: any, camp: any) => {
                  if (!acc[camp.date]) {
                    acc[camp.date] = { spend: 0, revenue: 0, conversions: 0, clicks: 0, reach: 0 };
                  }
                  acc[camp.date].spend += Number(camp.spend) || 0;
                  acc[camp.date].revenue += Number(camp.revenue) || 0;
                  acc[camp.date].conversions += Number(camp.conversions) || 0;
                  acc[camp.date].clicks += Number(camp.clicks) || 0;
                  acc[camp.date].reach += Number(camp.reach) || 0;
                  return acc;
                }, {});

                const chartData = Object.keys(dateMap).sort().map(date => {
                  const d = dateMap[date];
                  const roas = d.spend > 0 ? d.revenue / d.spend : 0;
                  const cpa = d.conversions > 0 ? d.spend / d.conversions : 0;
                  const ctr = d.reach > 0 ? (d.clicks / d.reach) * 100 : 0;

                  const dateObj = new Date(date + 'T12:00:00');
                  return {
                    name: `${dateObj.getDate()} ${dateObj.toLocaleString('es-ES', { month: 'short' })}`,
                    spend: d.spend,
                    revenue: d.revenue,
                    conversions: d.conversions,
                    roas: Number(roas.toFixed(2)),
                    cpa: Number(cpa.toFixed(2)),
                    ctr: Number(ctr.toFixed(2))
                  };
                });

                if (chartData.length === 0) return <p className={cn(darkMode ? "text-slate-400" : "text-slate-700")}>No hay datos históricos.</p>;

                return (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGrid} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: chartText, fontSize: 12 }} dx={-10}
                          tickFormatter={(val) => selectedMetricHistory.format === 'money' ? `$${val}` : val}
                        />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value: any) => [
                            selectedMetricHistory.format === 'money' ? `$${Number(value).toLocaleString()}` :
                              selectedMetricHistory.key === 'roas' ? `${value}x` : value,
                            selectedMetricHistory.title
                          ]}
                        />
                        <Line type="monotone" dataKey={selectedMetricHistory.key} name={selectedMetricHistory.title} stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}