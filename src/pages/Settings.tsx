import { useState, useEffect } from "react";
import {
  User, Shield, CreditCard, Bell, Globe, Key, Users, Plus, CheckCircle2,
  AlertTriangle, X, Eye, EyeOff, Save, Trash2, Copy, RefreshCw, Zap,
  Edit2, Search, ToggleLeft, ToggleRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function Toast({ msg, ok, dm }: { msg: string; ok: boolean; dm: boolean }) {
  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-3",
      ok
        ? dm ? "bg-emerald-900 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-700"
        : dm ? "bg-rose-900 border-rose-700 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-700"
    )}>
      {ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
      {msg}
    </div>
  );
}

function SectionTitle({ title, subtitle, dm }: { title: string; subtitle?: string; dm: boolean }) {
  return (
    <div className="mb-6">
      <h2 className={cn("text-xl font-semibold", dm ? "text-white" : "text-slate-900")}>{title}</h2>
      {subtitle && <p className={cn("text-sm mt-1", dm ? "text-slate-400" : "text-slate-500")}>{subtitle}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("Perfil");
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Perfil
  const [profileName, setProfileName] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [profileTimezone, setProfileTimezone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Seguridad
  const [currentPwd, setCurrentPwd] = useState(''); 
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  // Equipo
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Ventas');
  const [inviteSaving, setInviteSaving] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');

  // Notificaciones
  const [notifPrefs, setNotifPrefs] = useState({ newLeadsEmail: true, dailySummary: true, billingAlerts: true, pushNotifications: false, bookingEmail: true, saleEmail: true, notifyEmail: '' });
  const [notifSaving, setNotifSaving] = useState(false);


  // Preferencias
  const [prefLang, setPrefLang] = useState('es');
  const [prefDateFormat, setPrefDateFormat] = useState('DD/MM/YYYY');
  const [prefCurrency, setPrefCurrency] = useState('USD');
  const [prefSaving, setPrefSaving] = useState(false);

  // API Keys
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyCreated, setNewKeyCreated] = useState<{ key: string; name: string } | null>(null);
  const [keySaving, setKeySaving] = useState(false);

  // Activity log
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Dark mode sync
  useEffect(() => {
    const sync = () => {
      setDarkMode(localStorage.getItem("theme") === "dark" || document.documentElement.classList.contains("dark"));
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const iv = setInterval(sync, 300);
    return () => { obs.disconnect(); clearInterval(iv); };
  }, []);

  // Load initial data
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileCompany(user.company || '');
      setProfileTimezone((user as any).timezone || 'America/Santiago');
      setPrefLang((user as any).language || 'es');
      setPrefDateFormat((user as any).date_format || 'DD/MM/YYYY');
      setPrefCurrency((user as any).currency || 'USD');
    }
    setTeamLoading(true);
    api.getTeam().then(setTeamMembers).catch(console.error).finally(() => setTeamLoading(false));
    api.getApiKeys().then(setApiKeys).catch(console.error);
    api.getNotificationPrefs().then(setNotifPrefs).catch(console.error);
    api.getActivityLogs().then((logs: any[]) =>
      setActivityLogs(logs.map(l => ({ ...l, user: l.actor || l.user })))
    ).catch(console.error);
  }, [user?.id]);

  const showMsg = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const dm = darkMode;

  const inputCls = cn(
    "w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-colors",
    dm ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
       : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
  );

  const selectCls = cn(inputCls, "cursor-pointer");

  const tabs = [
    { name: "Perfil", icon: User },
    { name: "Seguridad", icon: Shield },
    { name: "Equipo y Roles", icon: Users },
    { name: "Facturación y Planes", icon: CreditCard },
    { name: "Notificaciones", icon: Bell },
    { name: "Preferencias", icon: Globe },
    { name: "API Keys", icon: Key },
  ];

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    try {
      await api.updateProfile({ name: profileName, company: profileCompany, timezone: profileTimezone });
      updateUser({ name: profileName, company: profileCompany });
      showMsg('Perfil actualizado correctamente.');
    } catch (e: any) {
      showMsg(e.message || 'Error al guardar', false);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) { showMsg('Completa todos los campos.', false); return; }
    if (newPwd !== confirmPwd) { showMsg('Las contraseñas no coinciden.', false); return; }
    if (newPwd.length < 6) { showMsg('La nueva contraseña debe tener al menos 6 caracteres.', false); return; }
    setPwdSaving(true);
    try {
      await api.changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      showMsg('Contraseña actualizada correctamente.');
    } catch (e: any) {
      showMsg(e.message || 'Error al cambiar contraseña', false);
    } finally {
      setPwdSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) { showMsg('El email es obligatorio.', false); return; }
    setInviteSaving(true);
    try {
      const m = await api.inviteTeamMember({ name: inviteName, email: inviteEmail, role: inviteRole });
      setTeamMembers(prev => [...prev, m]);
      setInviteName(''); setInviteEmail(''); setInviteRole('Ventas');
      setShowInviteModal(false);
      showMsg(`Invitación enviada a ${inviteEmail}`);
    } catch (e: any) {
      showMsg(e.message || 'Error al invitar', false);
    } finally {
      setInviteSaving(false);
    }
  };

  const handleDeleteMember = async (id: number, email: string) => {
    if (email === user?.email) { showMsg('No puedes eliminarte a ti mismo.', false); return; }
    if (!confirm('¿Eliminar este miembro del equipo? Perderá el acceso inmediatamente.')) return;
    try {
      await api.deleteTeamMember(id);
      setTeamMembers(prev => prev.filter(m => m.id !== id));
      showMsg('Miembro eliminado.');
    } catch (e: any) {
      showMsg(e.message || 'Error al eliminar', false);
    }
  };

  const openEditMember = (m: any) => {
    setEditingMember(m);
    setEditRole(m.role);
    setEditStatus(m.status);
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    setEditSaving(true);
    try {
      await api.updateTeamMember(editingMember.id, { role: editRole, status: editStatus });
      setTeamMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, role: editRole, status: editStatus } : m));
      setEditingMember(null);
      showMsg('Miembro actualizado correctamente.');
    } catch (e: any) {
      showMsg(e.message || 'Error al actualizar', false);
    } finally {
      setEditSaving(false);
    }
  };

  const handleSaveNotifs = async () => {
    setNotifSaving(true);
    try {
      await api.updateNotificationPrefs(notifPrefs);
      showMsg('Preferencias de notificación guardadas.');
    } catch (e: any) {
      showMsg(e.message || 'Error', false);
    } finally {
      setNotifSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    setPrefSaving(true);
    try {
      await api.updateProfile({ language: prefLang, date_format: prefDateFormat, currency: prefCurrency });
      showMsg('Preferencias guardadas.');
    } catch (e: any) {
      showMsg(e.message || 'Error', false);
    } finally {
      setPrefSaving(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) { showMsg('Ingresa un nombre para la key.', false); return; }
    setKeySaving(true);
    try {
      const result = await api.createApiKey(newKeyName.trim());
      setApiKeys(prev => [...prev, result]);
      setNewKeyCreated({ key: result.key, name: result.name });
      setNewKeyName('');
      showMsg('API Key creada. Cópiala ahora, no se mostrará de nuevo.');
    } catch (e: any) {
      showMsg(e.message || 'Error al crear', false);
    } finally {
      setKeySaving(false);
    }
  };

  const handleDeleteApiKey = async (id: number) => {
    if (!confirm('¿Eliminar esta API Key? Dejará de funcionar inmediatamente.')) return;
    try {
      await api.deleteApiKey(id);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      showMsg('API Key eliminada.');
    } catch (e: any) {
      showMsg(e.message || 'Error', false);
    }
  };

  // ─── Plan info ────────────────────────────────────────────────────────────────

  const plans = [
    {
      name: 'Básico', price: '$29', color: 'slate',
      features: ['Dashboard', 'Leads & Chats', 'Integraciones', 'Configuración', '1.000 leads/mes'],
    },
    {
      name: 'Pro', price: '$79', color: 'indigo',
      features: ['Todo el plan Básico', 'Automatizaciones de Flujos', 'Editor visual de flows', '5.000 leads/mes', 'Soporte prioritario'],
    },
    {
      name: 'Enterprise', price: '$149', color: 'amber',
      features: ['Todo el plan Pro', 'AnuncIA (análisis de ads)', 'Leads ilimitados', 'Acceso a API', 'Manager dedicado'],
    },
  ];

  const planColors: Record<string, { badge: string; border: string; btn: string }> = {
    slate: {
      badge: dm ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700',
      border: dm ? 'border-slate-700' : 'border-slate-200',
      btn: dm ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-900 hover:bg-slate-700 text-white',
    },
    indigo: {
      badge: 'bg-indigo-500/15 text-indigo-400',
      border: 'border-indigo-500',
      btn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    },
    amber: {
      badge: 'bg-amber-500/15 text-amber-400',
      border: 'border-amber-500',
      btn: 'bg-amber-600 hover:bg-amber-500 text-white',
    },
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className={cn("text-2xl font-bold", dm ? "text-white" : "text-slate-900")}>Configuración</h1>
        <p className={cn("mt-1", dm ? "text-slate-400" : "text-slate-500")}>Administra tu cuenta y preferencias de la plataforma.</p>
      </div>

      <div className={cn("rounded-xl border shadow-sm flex overflow-hidden min-h-[620px]", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>

        {/* Sidebar */}
        <div className={cn("w-56 border-r p-3 space-y-0.5 shrink-0", dm ? "border-slate-800 bg-slate-950/50" : "border-slate-200 bg-slate-50/60")}>
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeTab === tab.name
                  ? dm ? "bg-indigo-500/15 text-indigo-300" : "bg-indigo-50 text-indigo-700"
                  : dm ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <tab.icon className={cn("w-4 h-4 shrink-0", activeTab === tab.name ? (dm ? "text-indigo-300" : "text-indigo-600") : (dm ? "text-slate-500" : "text-slate-400"))} />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">

          {/* ─── Perfil ─── */}
          {activeTab === "Perfil" && (
            <div className="max-w-xl">
              <SectionTitle title="Información del Perfil" subtitle="Actualiza tu nombre, empresa y zona horaria." dm={dm} />

              <div className="flex items-center gap-5 mb-8 p-4 rounded-xl border" style={{ borderColor: dm ? '#334155' : '#e2e8f0', background: dm ? 'rgba(30,41,59,0.5)' : '#f8fafc' }}>
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl border-2", dm ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/20" : "bg-indigo-100 text-indigo-700 border-white shadow-sm")}>
                  {(profileName || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className={cn("font-semibold", dm ? "text-white" : "text-slate-900")}>{user?.email}</p>
                  <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>
                    Plan: <span className="text-indigo-500 font-medium">{user?.plan || 'Básico'}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Nombre completo</label>
                    <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Tu nombre" className={inputCls} />
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Empresa</label>
                    <input value={profileCompany} onChange={e => setProfileCompany(e.target.value)} placeholder="Tu empresa" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Correo Electrónico</label>
                  <input type="email" value={user?.email || ''} disabled className={cn(inputCls, "opacity-50 cursor-not-allowed")} />
                  <p className={cn("text-xs mt-1", dm ? "text-slate-500" : "text-slate-400")}>El email no se puede cambiar. Contacta a soporte.</p>
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Zona Horaria</label>
                  <select value={profileTimezone} onChange={e => setProfileTimezone(e.target.value)} className={selectCls}>
                    <option value="America/Santiago">América/Santiago (GMT-4)</option>
                    <option value="America/Mexico_City">América/México_City (GMT-6)</option>
                    <option value="America/Bogota">América/Bogotá (GMT-5)</option>
                    <option value="America/Buenos_Aires">América/Buenos_Aires (GMT-3)</option>
                    <option value="America/Lima">América/Lima (GMT-5)</option>
                    <option value="Europe/Madrid">Europa/Madrid (GMT+1)</option>
                    <option value="America/New_York">América/New_York (GMT-5)</option>
                  </select>
                </div>
              </div>

              <div className={cn("mt-8 pt-6 border-t flex justify-end", dm ? "border-slate-800" : "border-slate-100")}>
                <button onClick={handleSaveProfile} disabled={profileSaving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors">
                  {profileSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Cambios
                </button>
              </div>
            </div>
          )}

          {/* ─── Seguridad ─── */}
          {activeTab === "Seguridad" && (
            <div className="max-w-md">
              <SectionTitle title="Seguridad" subtitle="Cambia tu contraseña para mantener tu cuenta protegida." dm={dm} />

              <div className={cn("p-5 rounded-xl border space-y-4", dm ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200")}>
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Contraseña actual</label>
                  <div className="relative">
                    <input type={showCurrent ? 'text' : 'password'} value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" className={cn(inputCls, "pr-10")} />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)} className={cn("absolute right-3 top-1/2 -translate-y-1/2", dm ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Nueva contraseña</label>
                  <div className="relative">
                    <input type={showNew ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" className={cn(inputCls, "pr-10")} />
                    <button type="button" onClick={() => setShowNew(!showNew)} className={cn("absolute right-3 top-1/2 -translate-y-1/2", dm ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {newPwd && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={cn("h-1 flex-1 rounded-full transition-colors",
                            newPwd.length >= i * 2 ? (newPwd.length >= 8 ? "bg-emerald-500" : "bg-amber-500") : (dm ? "bg-slate-700" : "bg-slate-200")
                          )} />
                        ))}
                      </div>
                      <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-400")}>
                        {newPwd.length < 6 ? "Muy corta" : newPwd.length < 8 ? "Débil" : newPwd.length < 12 ? "Moderada" : "Fuerte"}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Confirmar nueva contraseña</label>
                  <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••" className={inputCls} />
                  {confirmPwd && newPwd !== confirmPwd && (
                    <p className="text-xs text-rose-500 mt-1">Las contraseñas no coinciden.</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={handleChangePassword} disabled={pwdSaving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors">
                  {pwdSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Actualizar Contraseña
                </button>
              </div>

              {/* Sessions info */}
              <div className={cn("mt-8 p-4 rounded-xl border", dm ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50")}>
                <p className={cn("text-sm font-medium mb-1", dm ? "text-slate-300" : "text-slate-700")}>Sesión activa</p>
                <p className={cn("text-xs", dm ? "text-slate-400" : "text-slate-500")}>Sesión iniciada como <strong>{user?.email}</strong>. El token JWT expira en 7 días.</p>
              </div>
            </div>
          )}

          {/* ─── Equipo y Roles ─── */}
          {activeTab === "Equipo y Roles" && (
            <div>
              {/* Header */}
              <div className="flex justify-between items-start mb-5">
                <SectionTitle title="Equipo y Roles" subtitle="Administra los accesos y permisos de tu equipo." dm={dm} />
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 shrink-0 ml-4 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Invitar miembro
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", dm ? "text-slate-500" : "text-slate-400")} />
                <input
                  value={teamSearch}
                  onChange={e => setTeamSearch(e.target.value)}
                  placeholder="Buscar por nombre o email..."
                  className={cn(
                    "w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border outline-none transition-colors",
                    dm ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500"
                       : "bg-white border-slate-200 text-slate-900 focus:border-indigo-500"
                  )}
                />
              </div>

              {/* Loading */}
              {teamLoading ? (
                <div className={cn("text-center py-12", dm ? "text-slate-500" : "text-slate-400")}>
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Cargando equipo...</p>
                </div>
              ) : teamMembers.filter(m =>
                  m.name?.toLowerCase().includes(teamSearch.toLowerCase()) ||
                  m.email?.toLowerCase().includes(teamSearch.toLowerCase())
                ).length === 0 ? (
                <div className={cn("text-center py-12 rounded-xl border border-dashed", dm ? "border-slate-700 text-slate-500" : "border-slate-300 text-slate-400")}>
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium mb-1">
                    {teamSearch ? 'Sin resultados para esa búsqueda' : 'Sin miembros de equipo'}
                  </p>
                  <p className="text-sm">
                    {teamSearch ? 'Prueba con otro término.' : 'Invita a tu equipo para colaborar en Sellia.'}
                  </p>
                </div>
              ) : (
                <div className={cn("rounded-xl border overflow-hidden", dm ? "border-slate-700" : "border-slate-200")}>
                  <table className="w-full text-sm">
                    <thead className={cn("border-b text-xs uppercase", dm ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500")}>
                      <tr>
                        <th className="px-5 py-3 text-left font-medium">Miembro</th>
                        <th className="px-5 py-3 text-left font-medium">Rol</th>
                        <th className="px-5 py-3 text-left font-medium">Estado</th>
                        <th className="px-5 py-3 text-right font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className={cn("divide-y", dm ? "divide-slate-800" : "divide-slate-100")}>
                      {teamMembers
                        .filter(m =>
                          m.name?.toLowerCase().includes(teamSearch.toLowerCase()) ||
                          m.email?.toLowerCase().includes(teamSearch.toLowerCase())
                        )
                        .map(m => {
                          const isSelf = m.email === user?.email;
                          return (
                            <tr key={m.id} className={cn("transition-colors", dm ? "hover:bg-slate-800/50" : "hover:bg-slate-50")}>
                              {/* Miembro */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                                    dm ? "bg-indigo-500/15 text-indigo-300" : "bg-indigo-100 text-indigo-700"
                                  )}>
                                    {(m.name || m.email || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className={cn("font-medium", dm ? "text-white" : "text-slate-900")}>{m.name || '—'}</p>
                                      {isSelf && (
                                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", dm ? "bg-indigo-500/20 text-indigo-300" : "bg-indigo-100 text-indigo-600")}>
                                          Tú
                                        </span>
                                      )}
                                    </div>
                                    <p className={cn("text-xs", dm ? "text-slate-400" : "text-slate-500")}>{m.email}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Rol */}
                              <td className="px-5 py-3.5">
                                <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium",
                                  m.role === 'Admin'      ? (dm ? "bg-purple-500/15 text-purple-300" : "bg-purple-100 text-purple-700") :
                                  m.role === 'Ventas'     ? (dm ? "bg-blue-500/15 text-blue-300"     : "bg-blue-100 text-blue-700") :
                                  m.role === 'Marketing'  ? (dm ? "bg-pink-500/15 text-pink-300"     : "bg-pink-100 text-pink-700") :
                                  m.role === 'Soporte'    ? (dm ? "bg-teal-500/15 text-teal-300"     : "bg-teal-100 text-teal-700") :
                                  dm ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
                                )}>
                                  {m.role}
                                </span>
                              </td>

                              {/* Estado — clickeable para toggle */}
                              <td className="px-5 py-3.5">
                                <button
                                  disabled={isSelf}
                                  onClick={async () => {
                                    const next = m.status === 'Activo' ? 'Inactivo' : 'Activo';
                                    try {
                                      await api.updateTeamMember(m.id, { status: next });
                                      setTeamMembers(prev => prev.map(x => x.id === m.id ? { ...x, status: next } : x));
                                    } catch (e: any) {
                                      showMsg(e.message || 'Error al cambiar estado', false);
                                    }
                                  }}
                                  className={cn(
                                    "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors",
                                    m.status === 'Activo'
                                      ? (dm ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")
                                      : m.status === 'Inactivo'
                                        ? (dm ? "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25" : "bg-rose-100 text-rose-700 hover:bg-rose-200")
                                        : (dm ? "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25" : "bg-amber-100 text-amber-700 hover:bg-amber-200"),
                                    isSelf && "cursor-default opacity-60"
                                  )}
                                  title={isSelf ? undefined : m.status === 'Activo' ? 'Clic para desactivar' : 'Clic para activar'}
                                >
                                  {m.status === 'Activo'
                                    ? <ToggleRight className="w-3.5 h-3.5" />
                                    : <ToggleLeft className="w-3.5 h-3.5" />}
                                  {m.status}
                                </button>
                              </td>

                              {/* Acciones */}
                              <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEditMember(m)}
                                    title="Editar rol y estado"
                                    className={cn("p-1.5 rounded-lg transition-colors", dm ? "text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50")}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMember(m.id, m.email)}
                                    title={isSelf ? 'No puedes eliminarte a ti mismo' : 'Eliminar miembro'}
                                    disabled={isSelf}
                                    className={cn("p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed", dm ? "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50")}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>

                  {/* Footer count */}
                  <div className={cn("px-5 py-2.5 border-t text-xs", dm ? "border-slate-700 text-slate-500" : "border-slate-100 text-slate-400")}>
                    {teamMembers.length} miembro{teamMembers.length !== 1 ? 's' : ''} en el equipo
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Edit member modal ─── */}
          {editingMember && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className={cn("w-full max-w-sm rounded-2xl shadow-2xl border", dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
                <div className={cn("px-6 py-4 border-b flex justify-between items-center", dm ? "border-slate-800" : "border-slate-100")}>
                  <div>
                    <h3 className={cn("font-semibold", dm ? "text-white" : "text-slate-900")}>Editar miembro</h3>
                    <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>{editingMember.email}</p>
                  </div>
                  <button onClick={() => setEditingMember(null)} className={cn("p-1.5 rounded-lg transition-colors", dm ? "text-slate-400 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100")}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Rol</label>
                    <select
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className={cn("w-full px-3 py-2.5 rounded-lg text-sm border outline-none", dm ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-200 focus:border-indigo-500")}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Ventas">Ventas</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Soporte">Soporte</option>
                    </select>
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Estado</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Activo', 'Invitado', 'Inactivo'].map(s => (
                        <button
                          key={s}
                          onClick={() => setEditStatus(s)}
                          className={cn(
                            "py-2 rounded-lg text-xs font-medium border transition-colors",
                            editStatus === s
                              ? s === 'Activo'   ? "bg-emerald-600 border-emerald-500 text-white"
                              : s === 'Inactivo' ? "bg-rose-600 border-rose-500 text-white"
                              :                   "bg-amber-600 border-amber-500 text-white"
                              : dm ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"
                                   : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={cn("flex justify-end gap-3 px-6 py-4 border-t", dm ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50")}>
                  <button onClick={() => setEditingMember(null)} className={cn("px-4 py-2 text-sm rounded-lg transition-colors", dm ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100")}>
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateMember}
                    disabled={editSaving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {editSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Facturación y Planes ─── */}
          {activeTab === "Facturación y Planes" && (
            <div>
              <SectionTitle title="Facturación y Planes" subtitle="Tu plan actual y opciones de actualización." dm={dm} />

              {/* Current plan banner */}
              <div className={cn("flex items-center justify-between p-5 rounded-xl border mb-8", dm ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100")}>
                <div>
                  <p className={cn("text-xs font-semibold uppercase tracking-wider mb-1", dm ? "text-indigo-400" : "text-indigo-500")}>Plan Actual</p>
                  <p className={cn("text-2xl font-bold", dm ? "text-white" : "text-slate-900")}>{user?.plan || 'Básico'}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm", dm ? "text-indigo-300" : "text-indigo-600")}>Módulos activos</p>
                  <div className="flex gap-1.5 mt-1 flex-wrap justify-end">
                    {[
                      { label: 'Dashboard', active: user?.has_dashboard },
                      { label: 'Leads', active: user?.has_chats },
                      { label: 'Flows', active: user?.has_flows },
                      { label: 'Ads', active: user?.has_ads },
                      { label: 'Integraciones', active: user?.has_integrations },
                    ].map(mod => (
                      <span key={mod.label} className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                        mod.active ? (dm ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-100 text-emerald-700") :
                        dm ? "bg-slate-700 text-slate-500" : "bg-slate-100 text-slate-400"
                      )}>
                        {mod.active ? '✓' : '✗'} {mod.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const isCurrentPlan = user?.plan === plan.name;
                  const colors = planColors[plan.color];
                  return (
                    <div key={plan.name} className={cn("rounded-xl border p-5 flex flex-col transition-all", colors.border, isCurrentPlan && "ring-2 ring-indigo-500", dm ? "bg-slate-800/60" : "bg-white")}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className={cn("text-xs font-semibold uppercase tracking-wider mb-1", dm ? "text-slate-400" : "text-slate-500")}>{plan.name}</p>
                          <p className={cn("text-2xl font-bold", dm ? "text-white" : "text-slate-900")}>{plan.price}<span className={cn("text-sm font-normal ml-1", dm ? "text-slate-400" : "text-slate-500")}>/mes</span></p>
                        </div>
                        {isCurrentPlan && <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", colors.badge)}>Actual</span>}
                      </div>
                      <ul className="space-y-2 flex-1 mb-5">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-2">
                            <CheckCircle2 className={cn("w-4 h-4 shrink-0 mt-0.5", plan.color === 'indigo' ? "text-indigo-500" : plan.color === 'amber' ? "text-amber-500" : "text-emerald-500")} />
                            <span className={cn("text-sm", dm ? "text-slate-300" : "text-slate-600")}>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        disabled={isCurrentPlan}
                        className={cn("w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-default", colors.btn)}
                      >
                        {isCurrentPlan ? 'Plan actual' : (<><Zap className="w-4 h-4" /> Actualizar a {plan.name}</>)}
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className={cn("text-xs mt-4 text-center", dm ? "text-slate-500" : "text-slate-400")}>
                Para cambiar de plan, contacta a tu administrador de Sellia.
              </p>
            </div>
          )}

          {/* ─── Notificaciones ─── */}
          {activeTab === "Notificaciones" && (
            <div className="max-w-xl space-y-8">
              <SectionTitle title="Notificaciones" subtitle="Configura cómo y cuándo recibes alertas." dm={dm} />

              {/* Email destino */}
              <div>
                <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>
                  Email para notificaciones
                </label>
                <input
                  type="email"
                  value={notifPrefs.notifyEmail}
                  onChange={e => setNotifPrefs(prev => ({ ...prev, notifyEmail: e.target.value }))}
                  placeholder="admin@tuempresa.com"
                  className={inputCls}
                />
                <p className={cn("text-xs mt-1", dm ? "text-slate-500" : "text-slate-400")}>
                  Aquí llegarán los emails de citas, ventas y nuevos leads. Requiere SMTP configurado abajo.
                </p>
              </div>

              {/* Toggles de alertas */}
              <div className="space-y-3">
                {[
                  { key: 'newLeadsEmail', label: 'Nuevos leads por email', desc: 'Recibe un correo cuando llegue un nuevo lead desde WhatsApp.' },
                  { key: 'bookingEmail', label: 'Citas agendadas por email', desc: 'Notificación al email cuando la IA o un agente agenda una cita.' },
                  { key: 'saleEmail', label: 'Ventas cerradas por email', desc: 'Notificación al email cuando la IA cierra una venta.' },
                  { key: 'dailySummary', label: 'Resumen diario', desc: 'Un informe cada mañana con el resumen de leads, conversaciones y ventas.' },
                  { key: 'billingAlerts', label: 'Alertas de facturación', desc: 'Notificaciones sobre pagos, renovaciones y cambios de plan.' },
                  { key: 'pushNotifications', label: 'Notificaciones push', desc: 'Alertas en tiempo real en tu navegador (requiere permiso).' },
                ].map(item => (
                  <div key={item.key}
                    className={cn("flex items-start justify-between p-4 rounded-xl border transition-colors cursor-pointer", dm ? "border-slate-700 hover:bg-slate-800/50" : "border-slate-200 hover:bg-slate-50")}
                    onClick={() => setNotifPrefs(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                  >
                    <div className="flex-1 mr-4">
                      <p className={cn("text-sm font-medium", dm ? "text-white" : "text-slate-900")}>{item.label}</p>
                      <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>{item.desc}</p>
                    </div>
                    <div className={cn("w-11 h-6 rounded-full transition-colors shrink-0 relative mt-0.5", notifPrefs[item.key as keyof typeof notifPrefs] ? "bg-indigo-600" : dm ? "bg-slate-700" : "bg-slate-200")}>
                      <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform", notifPrefs[item.key as keyof typeof notifPrefs] ? "translate-x-5 left-0.5" : "translate-x-0 left-0.5")} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button onClick={handleSaveNotifs} disabled={notifSaving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors">
                  {notifSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Preferencias
                </button>
              </div>

              {/* Info SMTP */}
              <div className={cn("p-4 rounded-xl border flex items-start gap-3", dm ? "border-slate-700 bg-slate-800/40" : "border-indigo-100 bg-indigo-50")}>
                <Bell className={cn("w-4 h-4 mt-0.5 shrink-0", dm ? "text-indigo-400" : "text-indigo-500")} />
                <div>
                  <p className={cn("text-sm font-medium", dm ? "text-indigo-300" : "text-indigo-700")}>Configuración SMTP</p>
                  <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-indigo-600/80")}>
                    El servidor de email (SMTP) se configura en el <strong>Panel de Administración → Configuración → Email & Notificaciones</strong>. Una vez configurado, los emails llegarán al correo que pongas arriba.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Preferencias ─── */}
          {activeTab === "Preferencias" && (
            <div className="max-w-xl">
              <SectionTitle title="Preferencias" subtitle="Personaliza el idioma, formato de fechas y moneda." dm={dm} />

              <div className="space-y-5">
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Idioma</label>
                  <select value={prefLang} onChange={e => setPrefLang(e.target.value)} className={selectCls}>
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Formato de Fecha</label>
                  <select value={prefDateFormat} onChange={e => setPrefDateFormat(e.target.value)} className={selectCls}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (ej: 17/03/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (ej: 03/17/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (ej: 2026-03-17)</option>
                  </select>
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Moneda</label>
                  <select value={prefCurrency} onChange={e => setPrefCurrency(e.target.value)} className={selectCls}>
                    <option value="USD">USD — Dólar americano</option>
                    <option value="CLP">CLP — Peso chileno</option>
                    <option value="MXN">MXN — Peso mexicano</option>
                    <option value="COP">COP — Peso colombiano</option>
                    <option value="ARS">ARS — Peso argentino</option>
                    <option value="PEN">PEN — Sol peruano</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>

                {/* Logs section */}
                <div className={cn("p-4 rounded-xl border", dm ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50")}>
                  <p className={cn("text-sm font-medium mb-3", dm ? "text-white" : "text-slate-900")}>Registro de Actividad Reciente</p>
                  {activityLogs.length === 0 ? (
                    <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-400")}>Sin actividad registrada aún.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {activityLogs.slice(0, 10).map((log, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                            log.action_color === 'emerald' ? 'bg-emerald-500' :
                            log.action_color === 'rose' ? 'bg-rose-500' :
                            log.action_color === 'amber' ? 'bg-amber-500' :
                            'bg-indigo-500'
                          )} />
                          <div>
                            <p className={cn("text-xs font-medium", dm ? "text-slate-300" : "text-slate-700")}>{log.action}</p>
                            <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-400")}>{log.details} · {log.user}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={handleSavePreferences} disabled={prefSaving} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors">
                  {prefSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Preferencias
                </button>
              </div>
            </div>
          )}

          {/* ─── API Keys ─── */}
          {activeTab === "API Keys" && (
            <div className="max-w-2xl">
              <SectionTitle title="API Keys" subtitle="Gestiona las claves para integrar Sellia con sistemas externos." dm={dm} />

              {/* Create new key */}
              <div className={cn("p-5 rounded-xl border mb-6", dm ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200")}>
                <p className={cn("text-sm font-medium mb-3", dm ? "text-white" : "text-slate-900")}>Crear nueva API Key</p>
                <div className="flex gap-3">
                  <input
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateApiKey()}
                    placeholder="Nombre de la key (ej: Producción, Staging...)"
                    className={cn(inputCls, "flex-1")}
                  />
                  <button onClick={handleCreateApiKey} disabled={keySaving || !newKeyName.trim()} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-colors shrink-0">
                    {keySaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Crear
                  </button>
                </div>
              </div>

              {/* New key reveal */}
              {newKeyCreated && (
                <div className={cn("p-4 rounded-xl border mb-6 space-y-3", dm ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200")}>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className={cn("text-sm font-medium", dm ? "text-emerald-300" : "text-emerald-700")}>Key creada: {newKeyCreated.name}</p>
                      <p className={cn("text-xs mt-0.5", dm ? "text-emerald-400" : "text-emerald-600")}>Cópiala ahora. No se mostrará de nuevo por seguridad.</p>
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-2 p-3 rounded-lg font-mono text-xs break-all", dm ? "bg-slate-900 text-emerald-300" : "bg-white text-emerald-700 border border-emerald-200")}>
                    <span className="flex-1">{newKeyCreated.key}</span>
                    <button onClick={() => { navigator.clipboard.writeText(newKeyCreated.key); showMsg('Key copiada al portapapeles.'); }} className="shrink-0 p-1 hover:opacity-70 transition-opacity">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <button onClick={() => setNewKeyCreated(null)} className={cn("text-xs", dm ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-600 hover:text-emerald-700")}>
                    Ya la copié, cerrar
                  </button>
                </div>
              )}

              {/* Key list */}
              {apiKeys.length === 0 ? (
                <div className={cn("text-center py-10 rounded-xl border border-dashed", dm ? "border-slate-700 text-slate-500" : "border-slate-300 text-slate-400")}>
                  <Key className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Sin API Keys creadas aún.</p>
                </div>
              ) : (
                <div className={cn("rounded-xl border overflow-hidden", dm ? "border-slate-700" : "border-slate-200")}>
                  <table className="w-full text-sm">
                    <thead className={cn("border-b text-xs uppercase", dm ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500")}>
                      <tr>
                        <th className="px-5 py-3 text-left font-medium">Nombre</th>
                        <th className="px-5 py-3 text-left font-medium">Key</th>
                        <th className="px-5 py-3 text-left font-medium">Creada</th>
                        <th className="px-5 py-3 text-right font-medium">Acción</th>
                      </tr>
                    </thead>
                    <tbody className={cn("divide-y", dm ? "divide-slate-800" : "divide-slate-100")}>
                      {apiKeys.map(k => (
                        <tr key={k.id} className={cn("transition-colors", dm ? "hover:bg-slate-800/50" : "hover:bg-slate-50")}>
                          <td className="px-5 py-3.5">
                            <p className={cn("font-medium", dm ? "text-white" : "text-slate-900")}>{k.name}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <code className={cn("text-xs px-2 py-1 rounded font-mono", dm ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-600")}>{k.key_prefix}</code>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className={cn("text-xs", dm ? "text-slate-400" : "text-slate-500")}>{k.created_at ? new Date(k.created_at).toLocaleDateString('es-ES') : '—'}</p>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button onClick={() => handleDeleteApiKey(k.id)} className={cn("p-1.5 rounded-lg transition-colors", dm ? "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10" : "text-slate-400 hover:text-rose-600 hover:bg-rose-50")}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className={cn("text-xs mt-4", dm ? "text-slate-500" : "text-slate-400")}>
                Las API Keys permiten acceso programático a Sellia. Trátalas como contraseñas — nunca las compartas ni expongas en el frontend.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={cn("w-full max-w-md rounded-2xl shadow-2xl border", dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
            <div className={cn("px-6 py-4 border-b flex justify-between items-center", dm ? "border-slate-800" : "border-slate-100")}>
              <h3 className={cn("font-semibold text-lg", dm ? "text-white" : "text-slate-900")}>Invitar miembro</h3>
              <button onClick={() => setShowInviteModal(false)} className={cn("p-1.5 rounded-lg transition-colors", dm ? "text-slate-400 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100")}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Nombre</label>
                <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Nombre del miembro" className={inputCls} />
              </div>
              <div>
                <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Email *</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@empresa.com" className={inputCls} />
              </div>
              <div>
                <label className={cn("block text-sm font-medium mb-1.5", dm ? "text-slate-300" : "text-slate-700")}>Rol</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className={selectCls}>
                  <option value="Admin">Admin</option>
                  <option value="Ventas">Ventas</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Soporte">Soporte</option>
                </select>
              </div>
            </div>
            <div className={cn("flex justify-end gap-3 px-6 py-4 border-t", dm ? "border-slate-800 bg-slate-900/50" : "border-slate-100 bg-slate-50")}>
              <button onClick={() => setShowInviteModal(false)} className={cn("px-4 py-2 text-sm rounded-lg transition-colors", dm ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100")}>
                Cancelar
              </button>
              <button onClick={handleInvite} disabled={inviteSaving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                {inviteSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Invitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} ok={toast.ok} dm={dm} />}
    </div>
  );
}
