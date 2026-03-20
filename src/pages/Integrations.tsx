import { Search, Link as LinkIcon, CheckCircle2, X, Eye, EyeOff, Copy, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const INTEGRATIONS = [
  { id: 1, name: "WhatsApp Business API", category: "Canales", status: "disconnected", icon: "💬", desc: "Conecta tu número oficial de WhatsApp." },
  { id: 2, name: "Instagram Direct", category: "Canales", status: "disconnected", icon: "📸", desc: "Automatiza respuestas en Instagram." },
  { id: 3, name: "Facebook Messenger", category: "Canales", status: "disconnected", icon: "📘", desc: "Atiende clientes desde tu Fanpage." },
  { id: 4, name: "HubSpot CRM", category: "CRM", status: "disconnected", icon: "🟧", desc: "Sincroniza leads y actividades." },
  { id: 5, name: "Salesforce", category: "CRM", status: "disconnected", icon: "☁️", desc: "Integración bidireccional de datos." },
  { id: 6, name: "Stripe", category: "Pagos", status: "disconnected", icon: "💳", desc: "Procesa pagos directamente en el chat." },
  { id: 7, name: "Google Calendar", category: "Productividad", status: "disconnected", icon: "📅", desc: "Permite a los leads agendar citas." },
  { id: 8, name: "Meta Ads", category: "Marketing", status: "disconnected", icon: "🎯", desc: "Sincroniza audiencias y conversiones." },
  { id: 9, name: "Google Ads", category: "Marketing", status: "disconnected", icon: "🔍", desc: "Optimiza campañas con datos offline." },
];

// ─── WhatsApp modal ───────────────────────────────────────────────────────────

function WhatsAppModal({ darkMode, onClose, onConnected }: { darkMode: boolean; onClose: () => void; onConnected: () => void }) {
  const [waConfig, setWaConfig] = useState<any>(null);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${window.location.origin}/api/webhooks/whatsapp`;

  const showMsg = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api.getWhatsappConfig().then((data) => {
      setWaConfig(data);
      if (data.connected) {
        setPhoneNumberId(data.phoneNumberId || '');
        setBusinessAccountId(data.businessAccountId || '');
        setDisplayName(data.displayName || '');
        setVerifyToken(data.verifyToken || '');
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      showMsg('Phone Number ID y Access Token son obligatorios.', false);
      return;
    }
    setSaving(true);
    try {
      const result = await api.saveWhatsappConfig({ phoneNumberId, accessToken, businessAccountId, displayName, verifyToken });
      setVerifyToken(result.verifyToken);
      setWaConfig({ connected: true, phoneNumberId, businessAccountId, displayName, verifyToken: result.verifyToken, hasToken: true });
      showMsg('¡WhatsApp conectado correctamente!');
      onConnected();
    } catch (e: any) {
      showMsg(e.message || 'Error al guardar.', false);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.deleteWhatsappConfig();
      setWaConfig({ connected: false });
      setPhoneNumberId('');
      setAccessToken('');
      setBusinessAccountId('');
      setDisplayName('');
      setVerifyToken('');
      showMsg('WhatsApp desconectado.');
      onConnected();
    } catch (e: any) {
      showMsg(e.message || 'Error al desconectar.', false);
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) {
      showMsg('Ingresa un número de destino (ej: 5491155556666).', false);
      return;
    }
    setTesting(true);
    try {
      const result = await api.testWhatsapp(testPhone.trim());
      showMsg(result.message);
    } catch (e: any) {
      showMsg(e.message || 'Error al enviar mensaje de prueba.', false);
    } finally {
      setTesting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dm = darkMode;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
      <div className={cn("w-full max-w-lg rounded-2xl shadow-xl my-4", dm ? "bg-slate-900 border border-slate-800" : "bg-white")}>

        {/* Header */}
        <div className={cn("flex justify-between items-center p-6 border-b", dm ? "border-slate-800" : "border-slate-100")}>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-lg border flex items-center justify-center text-xl", dm ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100")}>
              💬
            </div>
            <div>
              <h3 className={cn("font-semibold", dm ? "text-white" : "text-slate-900")}>WhatsApp Business API</h3>
              <p className={cn("text-xs", dm ? "text-slate-400" : "text-slate-500")}>
                {waConfig?.connected ? '✅ Conectado' : 'Sin configurar'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className={cn("p-2 rounded-lg transition-colors", dm ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Webhook URL */}
          <div>
            <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-2", dm ? "text-slate-400" : "text-slate-500")}>
              URL del Webhook (pegar en Meta Developer Console)
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={webhookUrl}
                className={cn("flex-1 px-3 py-2 rounded-lg text-sm font-mono border outline-none", dm ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700")}
              />
              <button onClick={handleCopy} className={cn("px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors", copied ? "bg-emerald-600 text-white" : dm ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>
                <Copy className="w-4 h-4" />
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Phone Number ID */}
          <div>
            <label className={cn("block text-sm font-medium mb-1", dm ? "text-slate-300" : "text-slate-700")}>
              Phone Number ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="Ej: 123456789012345"
              className={cn("w-full px-4 py-2 rounded-lg text-sm outline-none border", dm ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 focus:border-indigo-500")}
            />
            <p className={cn("text-xs mt-1", dm ? "text-slate-500" : "text-slate-400")}>
              Encuéntralo en Meta Developer Console → WhatsApp → API Setup
            </p>
          </div>

          {/* Access Token */}
          <div>
            <label className={cn("block text-sm font-medium mb-1", dm ? "text-slate-300" : "text-slate-700")}>
              Access Token (Permanente) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={waConfig?.hasToken ? `Token guardado: ${waConfig.tokenPreview}` : 'EAAxxxxxxxxxxxxx...'}
                className={cn("w-full px-4 py-2 pr-10 rounded-lg text-sm outline-none border", dm ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 focus:border-indigo-500")}
              />
              <button onClick={() => setShowToken(!showToken)} className={cn("absolute right-3 top-1/2 -translate-y-1/2", dm ? "text-slate-400 hover:text-slate-300" : "text-slate-400 hover:text-slate-600")}>
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className={cn("text-xs mt-1", dm ? "text-slate-500" : "text-slate-400")}>
              Usa un token permanente (System User token), no el temporal de 24h.
            </p>
          </div>

          {/* Business Account ID + Display Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn("block text-sm font-medium mb-1", dm ? "text-slate-300" : "text-slate-700")}>
                Business Account ID
              </label>
              <input
                type="text"
                value={businessAccountId}
                onChange={(e) => setBusinessAccountId(e.target.value)}
                placeholder="Opcional"
                className={cn("w-full px-4 py-2 rounded-lg text-sm outline-none border", dm ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 focus:border-indigo-500")}
              />
            </div>
            <div>
              <label className={cn("block text-sm font-medium mb-1", dm ? "text-slate-300" : "text-slate-700")}>
                Nombre del número
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Ventas Empresa"
                className={cn("w-full px-4 py-2 rounded-lg text-sm outline-none border", dm ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 focus:border-indigo-500")}
              />
            </div>
          </div>

          {/* Verify Token */}
          <div>
            <label className={cn("block text-sm font-medium mb-1", dm ? "text-slate-300" : "text-slate-700")}>
              Verify Token (para Meta)
            </label>
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="Se genera automáticamente si lo dejas vacío"
              className={cn("w-full px-4 py-2 rounded-lg text-sm outline-none border font-mono", dm ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 focus:border-indigo-500")}
            />
            <p className={cn("text-xs mt-1", dm ? "text-slate-500" : "text-slate-400")}>
              Pega este token en el campo "Verify Token" de Meta Developer Console al configurar el webhook.
            </p>
          </div>

          {/* Test message (only if connected) */}
          {waConfig?.connected && (
            <div className={cn("p-4 rounded-lg border", dm ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
              <p className={cn("text-sm font-medium mb-2", dm ? "text-slate-300" : "text-slate-700")}>Enviar mensaje de prueba</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Número destino (ej: 5491155556666)"
                  className={cn("flex-1 px-3 py-2 rounded-lg text-sm outline-none border", dm ? "bg-slate-900 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 focus:border-indigo-500")}
                />
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg flex items-center gap-1 disabled:opacity-50 transition-colors"
                >
                  {testing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  {testing ? 'Enviando...' : 'Probar'}
                </button>
              </div>
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div className={cn("px-4 py-3 rounded-lg text-sm font-medium", toast.ok ? (dm ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-50 text-emerald-700") : (dm ? "bg-red-500/20 text-red-300" : "bg-red-50 text-red-700"))}>
              {toast.msg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn("flex justify-between p-6 border-t", dm ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50")}>
          {waConfig?.connected ? (
            <button onClick={handleDisconnect} className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
              Desconectar
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors", dm ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100")}>
              Cerrar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {saving ? 'Guardando...' : 'Guardar y Conectar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Integrations() {
  const [integrations, setIntegrations] = useState<any[]>(INTEGRATIONS);
  const [darkMode, setDarkMode] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [selectedIntegration, setSelectedIntegration] = useState<any | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const filteredIntegrations = integrations.filter(int => {
    const matchesSearch = int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      int.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "Todos" || int.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDisconnect = async (integration: any) => {
    setIntegrations(prev => prev.map(i => i.id === integration.id ? { ...i, status: "disconnected" } : i));
    setSelectedIntegration(null);

    if (integration.category === 'Marketing') {
      const currentAds = JSON.parse(localStorage.getItem('connected_ads') || '{}');
      delete currentAds[integration.name];
      localStorage.setItem('connected_ads', JSON.stringify(currentAds));
    }

    try {
      await api.updateIntegration(integration.id, { status: "disconnected" });
    } catch (e) {
      console.error("API error, but UI updated", e);
    }
  };

  const handleSaveConfig = async (integrationId: number, config: any) => {
    setSelectedIntegration(null);
    try {
      await api.updateIntegration(integrationId, { config });
    } catch (e) {
      console.error(e);
    }
  };

  const refreshWhatsAppStatus = async () => {
    try {
      const waData = await api.getWhatsappConfig();
      setIntegrations(prev => prev.map(i =>
        i.name === 'WhatsApp Business API'
          ? { ...i, status: waData.connected ? 'connected' : 'disconnected' }
          : i
      ));
    } catch (_) {}
  };

  useEffect(() => {
    const localAdsStatus = JSON.parse(localStorage.getItem('connected_ads') || '{}');

    api.getIntegrations().then((data) => {
      let mergedIntegrations = INTEGRATIONS;
      if (data && data.length > 0) {
        mergedIntegrations = data.map((i: any) => ({ ...i, desc: i.description || '' }));
      }

      mergedIntegrations = mergedIntegrations.map(int => {
        if (int.category === 'Marketing' && localAdsStatus[int.name]) {
          return { ...int, status: 'connected' };
        }
        return int;
      });

      setIntegrations(mergedIntegrations);
    }).catch(console.error);

    refreshWhatsAppStatus();
  }, []);

  useEffect(() => {
    const syncTheme = () => {
      const isDark =
        localStorage.getItem("theme") === "dark" ||
        document.documentElement.classList.contains("dark");
      setDarkMode(isDark);
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const interval = setInterval(syncTheme, 300);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  const handleConnect = async (integration: any) => {
    // WhatsApp gets its own modal
    if (integration.name === 'WhatsApp Business API') {
      setShowWhatsAppModal(true);
      return;
    }

    setConnecting(String(integration.id));
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIntegrations(prev => prev.map(i => i.id === integration.id ? { ...i, status: "connected" } : i));
    setConnecting(null);

    if (integration.category === 'Marketing') {
      const currentAds = JSON.parse(localStorage.getItem('connected_ads') || '{}');
      currentAds[integration.name] = true;
      localStorage.setItem('connected_ads', JSON.stringify(currentAds));
    }

    try {
      await api.updateIntegration(integration.id, { status: "connected" });

      if (integration.category === 'Marketing') {
        const result = await api.syncAds({ platform: integration.name });
        console.log("Ads Sync:", result);
      }
    } catch (e) {
      console.error("API error, but UI updated", e);
    }
  };

  const handleConfigureClick = (integration: any) => {
    if (integration.name === 'WhatsApp Business API') {
      setShowWhatsAppModal(true);
      return;
    }
    setSelectedIntegration(integration);
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-end">
        <div>
          <h1 className={cn("text-2xl font-bold", darkMode ? "text-white" : "text-slate-900")}>
            Integraciones
          </h1>

          <p className={cn("mt-1", darkMode ? "text-slate-400" : "text-slate-500")}>
            Conecta Sellia con tus herramientas favoritas.
          </p>
        </div>

        <div className="relative w-64">
          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", darkMode ? "text-slate-500" : "text-slate-400")} />

          <input
            type="text"
            placeholder="Buscar integración..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none shadow-sm border",
              darkMode
                ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500"
                : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500"
            )}
          />
        </div>
      </div>

      <div className={cn("flex gap-2 pb-4 border-b", darkMode ? "border-slate-800" : "border-slate-200")}>
        {["Todos", "Canales", "CRM", "Pagos", "Marketing", "Productividad"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeCategory === cat
                ? darkMode
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "bg-indigo-50 text-indigo-700"
                : darkMode
                  ? "text-slate-400 hover:bg-slate-800"
                  : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {filteredIntegrations.map((int) => (
          <div
            key={int.id}
            className={cn(
              "p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow flex flex-col",
              darkMode
                ? "bg-slate-900 border-slate-800 hover:border-indigo-500/30"
                : "bg-white border-slate-200"
            )}
          >

            <div className="flex justify-between items-start mb-4">

              <div className={cn(
                "w-12 h-12 rounded-xl border flex items-center justify-center text-2xl",
                darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
              )}>
                {int.icon}
              </div>

              {int.status === "connected" ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Conectado
                </span>
              ) : (
                <span className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full",
                  darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                )}>
                  Disponible
                </span>
              )}
            </div>

            <div className="flex-1">
              <h3 className={cn("font-semibold", darkMode ? "text-white" : "text-slate-900")}>
                {int.name}
              </h3>

              <p className={cn("text-sm mt-1", darkMode ? "text-slate-400" : "text-slate-500")}>
                {int.desc}
              </p>
            </div>

            <div className={cn(
              "mt-6 pt-4 border-t flex justify-between items-center",
              darkMode ? "border-slate-800" : "border-slate-100"
            )}>

              <span className={cn(
                "text-xs font-medium uppercase tracking-wider",
                darkMode ? "text-slate-500" : "text-slate-400"
              )}>
                {int.category}
              </span>

              {int.status === "connected" ? (
                <button
                  onClick={() => handleConfigureClick(int)}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    darkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Configurar
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(int)}
                  disabled={connecting === String(int.id)}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {connecting === String(int.id) ? (
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : <LinkIcon className="w-4 h-4" />}
                  {connecting === String(int.id) ? 'Conectando...' : 'Conectar'}
                </button>
              )}
            </div>
          </div>
        ))}

      </div>

      {/* WhatsApp specific modal */}
      {showWhatsAppModal && (
        <WhatsAppModal
          darkMode={darkMode}
          onClose={() => setShowWhatsAppModal(false)}
          onConnected={() => { refreshWhatsAppStatus(); }}
        />
      )}

      {/* Generic integration modal */}
      {selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={cn(
            "w-full max-w-md rounded-2xl shadow-xl overflow-hidden",
            darkMode ? "bg-slate-900 border border-slate-800" : "bg-white"
          )}>
            <div className={cn(
              "flex justify-between items-center p-6 border-b",
              darkMode ? "border-slate-800" : "border-slate-100"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg border flex items-center justify-center text-xl",
                  darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"
                )}>
                  {selectedIntegration.icon}
                </div>
                <div>
                  <h3 className={cn("font-semibold", darkMode ? "text-white" : "text-slate-900")}>
                    {selectedIntegration.name}
                  </h3>
                  <p className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>
                    Configuración de integración
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIntegration(null)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>
                  API Key / Token
                </label>
                <input
                  type="password"
                  placeholder="Introduce el token de acceso..."
                  className={cn(
                    "w-full px-4 py-2 rounded-lg text-sm outline-none border",
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500"
                      : "bg-white border-slate-200 focus:border-indigo-500"
                  )}
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>
                  Webhook URL (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="https://"
                  className={cn(
                    "w-full px-4 py-2 rounded-lg text-sm outline-none border",
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500"
                      : "bg-white border-slate-200 focus:border-indigo-500"
                  )}
                />
              </div>

              <div className={cn("p-4 rounded-lg mt-6", darkMode ? "bg-amber-500/10 text-amber-200/90" : "bg-amber-50 text-amber-800")}>
                <p className="text-sm">
                  Al desconectar esta integración, se detendrá la sincronización de datos inmediatamente.
                </p>
              </div>
            </div>

            <div className={cn(
              "flex justify-between p-6 border-t",
              darkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50"
            )}>
              <button
                onClick={() => handleDisconnect(selectedIntegration)}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Desconectar
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedIntegration(null)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    darkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleSaveConfig(selectedIntegration.id, {})}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
