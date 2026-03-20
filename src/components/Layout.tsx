import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  LayoutDashboard,
  MessageSquare,
  Workflow,
  BarChart3,
  Blocks,
  Settings,
  Bell,
  Search,
  User,
  CheckCircle2,
  MessageCircle,
  AlertTriangle,
  LogOut,
  Moon,
  Sun,
  Lock,
  Zap,
  X,
  CalendarDays,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getNotifications, loadNotifications, markAllAsRead, type Notification } from "@/lib/notifications";
import logoUrl from '../assets/logo.png';

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, featureFlag: "has_dashboard" },
  { name: "Leads", href: "/chats", icon: MessageSquare, featureFlag: "has_chats" },
  { name: "Automatizaciones", href: "/flows", icon: Workflow, featureFlag: "has_flows" },
  { name: "Calendario", href: "/calendar", icon: CalendarDays, featureFlag: "has_chats" },
  { name: "Cobranza", href: "/collections", icon: DollarSign, featureFlag: "has_chats" },
  { name: "AnuncIA (Plus)", href: "/ads", icon: BarChart3, featureFlag: "has_ads" },
  { name: "Integraciones", href: "/integrations", icon: Blocks, featureFlag: "has_integrations" },
  { name: "Configuración", href: "/settings", icon: Settings, featureFlag: "has_settings" },
];

const PLAN_LABELS: Record<string, string> = {
  Básico: "Plan Básico",
  Pro: "Plan Pro",
  Enterprise: "Plan Enterprise",
};

const MODULE_PLAN: Record<string, string> = {
  has_flows: "Pro",
  has_ads: "Enterprise",
};

// ─── Upgrade Modal ─────────────────────────────────────────────────────────────

function UpgradeModal({ feature, darkMode, onClose }: { feature: string; darkMode: boolean; onClose: () => void }) {
  const required = MODULE_PLAN[feature] || "Pro";
  const dm = darkMode;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={cn(
        "w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border",
        dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
      )}>
        <div className="relative p-8 text-center">
          <button
            onClick={onClose}
            className={cn("absolute top-4 right-4 p-1.5 rounded-lg transition-colors", dm ? "text-slate-400 hover:bg-slate-800" : "text-slate-400 hover:bg-slate-100")}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <h3 className={cn("text-xl font-bold mb-2", dm ? "text-white" : "text-slate-900")}>
            Módulo bloqueado
          </h3>
          <p className={cn("text-sm mb-6", dm ? "text-slate-400" : "text-slate-500")}>
            Este módulo requiere el <strong className="text-indigo-500">{PLAN_LABELS[required] || required}</strong> o superior. Actualiza tu plan para desbloquear todas las funcionalidades.
          </p>

          <div className={cn("rounded-xl p-4 mb-6 text-left space-y-2 border", dm ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-100")}>
            <p className={cn("text-xs font-semibold uppercase tracking-wider mb-2", dm ? "text-indigo-300" : "text-indigo-600")}>
              Incluido en {PLAN_LABELS[required]}
            </p>
            {required === "Pro" && (
              <>
                <Feature dm={dm} text="Automatizaciones de flujos ilimitadas" />
                <Feature dm={dm} text="Editor visual de flows con nodos IA" />
                <Feature dm={dm} text="Ejecución automática de secuencias" />
              </>
            )}
            {required === "Enterprise" && (
              <>
                <Feature dm={dm} text="Panel AnuncIA con análisis de campañas" />
                <Feature dm={dm} text="IA para optimizar anuncios Meta & Google" />
                <Feature dm={dm} text="Alertas automáticas de rendimiento" />
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className={cn("flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors", dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
              Ahora no
            </button>
            <button className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg transition-all">
              <Zap className="w-4 h-4" /> Actualizar plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ dm, text }: { dm: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
      <span className={cn("text-xs", dm ? "text-slate-300" : "text-slate-700")}>{text}</span>
    </div>
  );
}

// ─── Layout ────────────────────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [upgradeModal, setUpgradeModal] = useState<string | null>(null); // featureFlag of locked module

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncNotifs = () => setNotifications(getNotifications());
    loadNotifications().then(syncNotifs);
    window.addEventListener("notifications_updated", syncNotifs);
    return () => window.removeEventListener("notifications_updated", syncNotifs);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfileMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const handleLogout = () => { logout(); navigate('/login'); };

  const hasFeature = (flag: string) =>
    !flag || !user || user.role === 'superadmin' || !!user[flag as keyof typeof user];

  // Check if the CURRENT route is locked
  const currentNav = navigation.find(item =>
    item.href === location.pathname ||
    (item.href !== "/" && location.pathname.startsWith(item.href))
  );
  const currentIsLocked = currentNav?.featureFlag ? !hasFeature(currentNav.featureFlag) : false;

  const dm = darkMode;

  return (
    <div className={cn("min-h-screen flex transition-colors duration-300", dm ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900")}>

      {/* Sidebar */}
      <div className={cn("w-64 border-r flex flex-col transition-colors duration-300 shrink-0", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>

        {/* Logo */}
        <div className={cn("h-20 flex items-center px-6 border-b shrink-0", dm ? "border-slate-800" : "border-slate-200")}>
          <Link to="/" className="flex items-center gap-3 group overflow-hidden">
            <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain transition-transform group-hover:scale-105 shrink-0" />
            <span className={cn("font-bold text-[17px] tracking-wide truncate", dm ? "text-white" : "text-slate-900")} title={user?.company || 'Mi Empresa'}>
              {user?.company || 'Mi Empresa'}
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navigation.map((item) => {
            const locked = !hasFeature(item.featureFlag);
            const isActive =
              location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));

            if (locked) {
              return (
                <button
                  key={item.name}
                  onClick={() => setUpgradeModal(item.featureFlag)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors group relative",
                    dm
                      ? "text-slate-600 hover:bg-slate-800/50 hover:text-slate-400"
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-500"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0", dm ? "text-slate-700" : "text-slate-300")} />
                  <span className="flex-1 text-left">{item.name}</span>
                  <Lock className={cn("w-3.5 h-3.5 shrink-0", dm ? "text-slate-700" : "text-slate-300")} />
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? dm ? "bg-indigo-500/15 text-indigo-300" : "bg-indigo-50 text-indigo-700"
                    : dm ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? (dm ? "text-indigo-300" : "text-indigo-700") : (dm ? "text-slate-500" : "text-slate-400"))} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Plan usage */}
        <div className={cn("p-4 border-t", dm ? "border-slate-800" : "border-slate-200")}>
          <div className={cn("rounded-lg p-3 border", dm ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
            <div className={cn("text-xs font-medium uppercase mb-2", dm ? "text-slate-400" : "text-slate-500")}>
              Plan Actual
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className={cn("text-sm font-semibold", dm ? "text-white" : "text-slate-900")}>{user?.plan || 'Básico'}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                user?.plan === 'Enterprise' ? "bg-amber-100 text-amber-700" :
                user?.plan === 'Pro' ? "bg-indigo-100 text-indigo-700" :
                dm ? "bg-slate-700 text-slate-300" : "bg-slate-200 text-slate-600"
              )}>
                {user?.plan || 'Básico'}
              </span>
            </div>
            <Link to="/settings" className="text-xs text-indigo-500 font-medium hover:underline">
              Ver configuración →
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top header */}
        <header className={cn("h-20 border-b flex items-center justify-between px-8 shrink-0", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
          <div className="flex-1 flex">
            <div className="relative w-full max-w-md">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", dm ? "text-slate-500" : "text-slate-400")} />
              <input
                type="text"
                placeholder="Buscar leads, flujos, campañas..."
                className={cn(
                  "w-full pl-10 pr-4 py-2 rounded-lg text-sm border outline-none transition-all",
                  dm ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-indigo-500" : "bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500"
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode(!dm)}
              className={cn("p-2 rounded-lg transition-colors", dm ? "bg-slate-800 text-yellow-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
              title={dm ? "Modo claro" : "Modo oscuro"}
            >
              {dm ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn("relative p-2 transition-colors", dm ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600")}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className={cn("absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2", dm ? "border-slate-900" : "border-white")} />
                )}
              </button>

              {showNotifications && (
                <div className={cn("absolute top-full right-0 mt-2 w-80 rounded-xl shadow-lg border overflow-hidden z-50", dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
                  <div className={cn("p-4 border-b flex justify-between items-center", dm ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50")}>
                    <h3 className={cn("font-semibold", dm ? "text-white" : "text-slate-900")}>Notificaciones</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="text-xs text-indigo-500 font-medium hover:underline">
                        Marcar leídas
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className={cn("p-6 text-center text-sm", dm ? "text-slate-400" : "text-slate-500")}>
                        No tienes notificaciones.
                      </div>
                    ) : notifications.map((notif) => (
                      <div key={notif.id} className={cn("p-4 border-b transition-colors cursor-pointer", dm ? "border-slate-800 hover:bg-slate-800" : "border-slate-100 hover:bg-slate-50", !notif.read && (dm ? "bg-indigo-500/10" : "bg-indigo-50/30"))}>
                        <div className="flex gap-3 items-start">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            notif.type === "success" ? "bg-emerald-100 text-emerald-600" :
                            notif.type === "alert" ? "bg-rose-100 text-rose-600" :
                            notif.type === "lead" ? "bg-blue-100 text-blue-600" : "bg-indigo-100 text-indigo-600"
                          )}>
                            {notif.type === "success" && <CheckCircle2 className="w-4 h-4" />}
                            {notif.type === "alert" && <AlertTriangle className="w-4 h-4" />}
                            {notif.type === "lead" && <MessageCircle className="w-4 h-4" />}
                            {notif.type === "message" && <Bell className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className={cn("text-sm font-medium", dm ? "text-white" : "text-slate-900")}>{notif.title}</p>
                            <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>{notif.message}</p>
                            <p className={cn("text-[10px] mt-1", dm ? "text-slate-500" : "text-slate-400")}>
                              {new Date(notif.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={cn("p-3 border-t text-center", dm ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50")}>
                    <button className={cn("text-xs font-medium transition-colors", dm ? "text-slate-300 hover:text-indigo-400" : "text-slate-600 hover:text-indigo-600")}>
                      Ver todas las notificaciones
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className={cn("w-8 h-8 rounded-full flex items-center justify-center font-medium border cursor-pointer transition-colors", dm ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25" : "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200")}
              >
                <User className="w-4 h-4" />
              </button>

              {showProfileMenu && (
                <div className={cn("absolute top-full right-0 mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-50", dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
                  <div className={cn("p-3 border-b", dm ? "border-slate-800 bg-slate-800" : "border-slate-100 bg-slate-50")}>
                    <p className={cn("text-sm font-semibold", dm ? "text-white" : "text-slate-900")}>{user?.name || 'Usuario'}</p>
                    <p className={cn("text-xs truncate", dm ? "text-slate-400" : "text-slate-500")}>{user?.email || ''}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { setShowProfileMenu(false); navigate("/settings"); }}
                      className={cn("w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2", dm ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600")}
                    >
                      <User className="w-4 h-4" /> Mi Cuenta
                    </button>
                    <button
                      onClick={handleLogout}
                      className={cn("w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2", dm ? "text-rose-400 hover:bg-rose-500/10" : "text-rose-600 hover:bg-rose-50")}
                    >
                      <LogOut className="w-4 h-4" /> Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={cn("flex-1 overflow-auto p-8 relative", dm ? "bg-slate-950" : "bg-slate-50")}>
          {/* Blur overlay for locked modules */}
          {currentIsLocked ? (
            <div className="relative">
              <div className="blur-sm pointer-events-none select-none opacity-60">
                {children}
              </div>
              {/* Upgrade card on top */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className={cn("w-full max-w-md rounded-2xl shadow-2xl border p-8 text-center mx-4", dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <h3 className={cn("text-xl font-bold mb-2", dm ? "text-white" : "text-slate-900")}>
                    Módulo bloqueado
                  </h3>
                  <p className={cn("text-sm mb-6", dm ? "text-slate-400" : "text-slate-500")}>
                    Este módulo requiere el{" "}
                    <strong className="text-indigo-500">
                      {PLAN_LABELS[MODULE_PLAN[currentNav?.featureFlag || ""] || "Pro"] || "Plan Pro"}
                    </strong>.
                    Actualiza tu plan para desbloquearlo.
                  </p>
                  <Link
                    to="/settings"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg transition-all"
                  >
                    <Zap className="w-4 h-4" /> Ver planes y actualizar
                  </Link>
                </div>
              </div>
            </div>
          ) : children}
        </main>
      </div>

      {/* Upgrade modal when clicking locked sidebar item */}
      {upgradeModal && (
        <UpgradeModal
          feature={upgradeModal}
          darkMode={dm}
          onClose={() => setUpgradeModal(null)}
        />
      )}
    </div>
  );
}
