import { useState, useEffect, useRef } from "react";
import {
  Users, TrendingUp, MessageSquare, DollarSign, Plus, Trash2, Edit2,
  Check, X, Shield, LogOut, ToggleLeft, ToggleRight, ChevronDown, Eye, EyeOff,
  LayoutDashboard, Workflow, BarChart3, Blocks, Settings, RefreshCw,
  BrainCircuit, KeyRound, CheckCircle2, AlertTriangle, Save, Sun, Moon,
  Bot, Send, BookOpen, Lightbulb, TrendingDown, Star, Zap, CheckCheck,
  BookMarked, Activity, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Bell, Smartphone, History, UserCog, FileText, FileSpreadsheet, Link2
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoUrl from '../assets/logo.png';

// ── Admin Color Themes ──────────────────────────────────────────────────────
export type ThemeKey = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose' | 'sellia';

interface AdminTheme {
  name: string; swatch: string;
  header: string; topBorder: string; headerText: string; headerBtnHover: string;
  badge: string;
  logoFrom: string; logoTo: string; logoShadow: string;
  activeNav: string; navLight: string;
  pageBg: string; sidebar: string; border: string;
  bg50: string; bg50s: string; hover50: string; hover100: string;
  iconBg: string; iconBg2: string; iconCol: string; iconColMd: string;
  btn: string; link: string; linkMd: string; text600: string;
  focus: string;
  darkSugBox: string; darkSugTitle: string; darkSugNum: string;
  planDarkPro: string; planLightPro: string; planLightBasico: string;
  tableHead: string; tableHover: string;
  msgBubble: string; todayBg: string; toggleOn: string;
  featureOn: string; featureIcon: string;
  calBorder: string;
}

export const ADMIN_THEMES: Record<ThemeKey, AdminTheme> = {
  violet: {
    name: 'Violeta', swatch: 'bg-violet-500',
    header: 'bg-violet-950 border-violet-900', topBorder: 'border-t-violet-600',
    headerText: 'text-violet-300', headerBtnHover: 'hover:bg-violet-800/40',
    badge: 'bg-violet-500/30 text-violet-200 border border-violet-400/40',
    logoFrom: 'from-violet-500', logoTo: 'to-fuchsia-600', logoShadow: 'shadow-violet-500/30',
    activeNav: 'bg-violet-600 text-white shadow-sm shadow-violet-500/30',
    navLight: 'text-violet-900/70 hover:bg-violet-100 hover:text-violet-900',
    pageBg: 'bg-violet-50', sidebar: 'bg-violet-50 border-violet-200',
    border: 'border-violet-200', bg50: 'bg-violet-50', bg50s: 'bg-violet-50/60',
    hover50: 'hover:bg-violet-50/60', hover100: 'hover:bg-violet-100',
    iconBg: 'bg-violet-500/15', iconBg2: 'bg-violet-500/20',
    iconCol: 'text-violet-400', iconColMd: 'text-violet-500', text600: 'text-violet-600',
    btn: 'bg-violet-600 hover:bg-violet-500',
    link: '{T.link}', linkMd: 'text-violet-500',
    focus: 'focus:ring-violet-500 focus:border-violet-500',
    darkSugBox: '{T.darkSugBox}',
    darkSugTitle: 'text-violet-500', darkSugNum: 'bg-violet-500/20 text-violet-500',
    planDarkPro: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    planLightPro: 'bg-violet-100 text-violet-700 border-violet-200',
    planLightBasico: 'bg-violet-100 text-violet-700 border-violet-200',
    tableHead: '{T.tableHead}',
    tableHover: 'hover:bg-violet-50/60',
    msgBubble: '{T.msgBubble}',
    todayBg: 'bg-violet-600 text-white', toggleOn: '{T.toggleOn}',
    featureOn: '{T.featureOn}', featureIcon: 'text-violet-500',
    calBorder: 'hover:border-violet-500',
  },
  blue: {
    name: 'Azul', swatch: 'bg-blue-500',
    header: 'bg-blue-950 border-blue-900', topBorder: 'border-t-blue-600',
    headerText: 'text-blue-300', headerBtnHover: 'hover:bg-blue-800/40',
    badge: 'bg-blue-500/30 text-blue-200 border border-blue-400/40',
    logoFrom: 'from-blue-500', logoTo: 'to-cyan-500', logoShadow: 'shadow-blue-500/30',
    activeNav: 'bg-blue-600 text-white shadow-sm shadow-blue-500/30',
    navLight: 'text-blue-900/70 hover:bg-blue-100 hover:text-blue-900',
    pageBg: 'bg-blue-50', sidebar: 'bg-blue-50 border-blue-200',
    border: 'border-blue-200', bg50: 'bg-blue-50', bg50s: 'bg-blue-50/60',
    hover50: 'hover:bg-blue-50/60', hover100: 'hover:bg-blue-100',
    iconBg: 'bg-blue-500/15', iconBg2: 'bg-blue-500/20',
    iconCol: 'text-blue-400', iconColMd: 'text-blue-500', text600: 'text-blue-600',
    btn: 'bg-blue-600 hover:bg-blue-500',
    link: 'text-blue-400 hover:text-blue-300', linkMd: 'text-blue-500',
    focus: 'focus:ring-blue-500 focus:border-blue-500',
    darkSugBox: 'border-blue-500/20 bg-blue-500/5',
    darkSugTitle: 'text-blue-500', darkSugNum: 'bg-blue-500/20 text-blue-500',
    planDarkPro: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    planLightPro: 'bg-blue-100 text-blue-700 border-blue-200',
    planLightBasico: 'bg-blue-100 text-blue-700 border-blue-200',
    tableHead: 'bg-blue-50/60 border-blue-200 text-slate-500',
    tableHover: 'hover:bg-blue-50/60',
    msgBubble: 'bg-blue-600 text-white rounded-tr-sm',
    todayBg: 'bg-blue-600 text-white', toggleOn: 'bg-blue-600 border-blue-600',
    featureOn: 'bg-blue-500/10 border-blue-500/30', featureIcon: 'text-blue-500',
    calBorder: 'hover:border-blue-500',
  },
  emerald: {
    name: 'Verde', swatch: 'bg-emerald-500',
    header: 'bg-emerald-950 border-emerald-900', topBorder: 'border-t-emerald-600',
    headerText: 'text-emerald-300', headerBtnHover: 'hover:bg-emerald-800/40',
    badge: 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40',
    logoFrom: 'from-emerald-500', logoTo: 'to-teal-500', logoShadow: 'shadow-emerald-500/30',
    activeNav: 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30',
    navLight: 'text-emerald-900/70 hover:bg-emerald-100 hover:text-emerald-900',
    pageBg: 'bg-emerald-50', sidebar: 'bg-emerald-50 border-emerald-200',
    border: 'border-emerald-200', bg50: 'bg-emerald-50', bg50s: 'bg-emerald-50/60',
    hover50: 'hover:bg-emerald-50/60', hover100: 'hover:bg-emerald-100',
    iconBg: 'bg-emerald-500/15', iconBg2: 'bg-emerald-500/20',
    iconCol: 'text-emerald-400', iconColMd: 'text-emerald-500', text600: 'text-emerald-600',
    btn: 'bg-emerald-600 hover:bg-emerald-500',
    link: 'text-emerald-400 hover:text-emerald-300', linkMd: 'text-emerald-500',
    focus: 'focus:ring-emerald-500 focus:border-emerald-500',
    darkSugBox: 'border-emerald-500/20 bg-emerald-500/5',
    darkSugTitle: 'text-emerald-500', darkSugNum: 'bg-emerald-500/20 text-emerald-500',
    planDarkPro: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    planLightPro: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    planLightBasico: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    tableHead: 'bg-emerald-50/60 border-emerald-200 text-slate-500',
    tableHover: 'hover:bg-emerald-50/60',
    msgBubble: 'bg-emerald-600 text-white rounded-tr-sm',
    todayBg: 'bg-emerald-600 text-white', toggleOn: 'bg-emerald-600 border-emerald-600',
    featureOn: 'bg-emerald-500/10 border-emerald-500/30', featureIcon: 'text-emerald-500',
    calBorder: 'hover:border-emerald-500',
  },
  amber: {
    name: 'Dorado', swatch: 'bg-amber-500',
    header: 'bg-slate-900 border-slate-800', topBorder: 'border-t-amber-500',
    headerText: 'text-slate-400', headerBtnHover: 'hover:bg-slate-800',
    badge: 'bg-amber-500/25 text-amber-300 border border-amber-400/40',
    logoFrom: 'from-amber-500', logoTo: 'to-orange-500', logoShadow: 'shadow-amber-500/30',
    activeNav: 'bg-slate-700 text-white shadow-sm',
    navLight: 'text-slate-400 hover:text-white hover:bg-slate-800',
    pageBg: 'bg-slate-50', sidebar: 'bg-white border-slate-200',
    border: 'border-slate-200', bg50: 'bg-slate-50', bg50s: 'bg-slate-50',
    hover50: 'hover:bg-slate-50', hover100: 'hover:bg-slate-100',
    iconBg: 'bg-slate-700/15', iconBg2: 'bg-slate-700/20',
    iconCol: 'text-slate-600', iconColMd: 'text-slate-600', text600: 'text-slate-700',
    btn: 'bg-slate-700 hover:bg-slate-600',
    link: 'text-slate-600 hover:text-slate-900', linkMd: 'text-slate-700',
    focus: 'focus:ring-slate-500 focus:border-slate-500',
    darkSugBox: 'border-slate-600/20 bg-slate-700/5',
    darkSugTitle: 'text-slate-300', darkSugNum: 'bg-slate-700/60 text-slate-200',
    planDarkPro: 'bg-slate-700/40 text-slate-200 border-slate-600',
    planLightPro: 'bg-slate-100 text-slate-700 border-slate-300',
    planLightBasico: 'bg-slate-100 text-slate-700 border-slate-200',
    tableHead: 'bg-slate-50 border-slate-200 text-slate-500',
    tableHover: 'hover:bg-slate-50',
    msgBubble: 'bg-amber-500 text-white rounded-tr-sm',
    todayBg: 'bg-slate-700 text-white', toggleOn: 'bg-slate-700 border-slate-700',
    featureOn: 'bg-slate-700/10 border-slate-600/30', featureIcon: 'text-slate-600',
    calBorder: 'hover:border-slate-500',
  },
  rose: {
    name: 'Rojo', swatch: 'bg-rose-500',
    header: 'bg-rose-950 border-rose-900', topBorder: 'border-t-rose-600',
    headerText: 'text-rose-300', headerBtnHover: 'hover:bg-rose-800/40',
    badge: 'bg-rose-500/30 text-rose-200 border border-rose-400/40',
    logoFrom: 'from-rose-500', logoTo: 'to-pink-500', logoShadow: 'shadow-rose-500/30',
    activeNav: 'bg-rose-600 text-white shadow-sm shadow-rose-500/30',
    navLight: 'text-rose-900/70 hover:bg-rose-100 hover:text-rose-900',
    pageBg: 'bg-rose-50', sidebar: 'bg-rose-50 border-rose-200',
    border: 'border-rose-200', bg50: 'bg-rose-50', bg50s: 'bg-rose-50/60',
    hover50: 'hover:bg-rose-50/60', hover100: 'hover:bg-rose-100',
    iconBg: 'bg-rose-500/15', iconBg2: 'bg-rose-500/20',
    iconCol: 'text-rose-400', iconColMd: 'text-rose-500', text600: 'text-rose-600',
    btn: 'bg-rose-600 hover:bg-rose-500',
    link: 'text-rose-400 hover:text-rose-300', linkMd: 'text-rose-500',
    focus: 'focus:ring-rose-500 focus:border-rose-500',
    darkSugBox: 'border-rose-500/20 bg-rose-500/5',
    darkSugTitle: 'text-rose-500', darkSugNum: 'bg-rose-500/20 text-rose-500',
    planDarkPro: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    planLightPro: 'bg-rose-100 text-rose-700 border-rose-200',
    planLightBasico: 'bg-rose-100 text-rose-700 border-rose-200',
    tableHead: 'bg-rose-50/60 border-rose-200 text-slate-500',
    tableHover: 'hover:bg-rose-50/60',
    msgBubble: 'bg-rose-600 text-white rounded-tr-sm',
    todayBg: 'bg-rose-600 text-white', toggleOn: 'bg-rose-600 border-rose-600',
    featureOn: 'bg-rose-500/10 border-rose-500/30', featureIcon: 'text-rose-500',
    calBorder: 'hover:border-rose-500',
  },
  sellia: {
    name: 'Sellia', swatch: 'bg-cyan-400',
    header: 'bg-[#1a0538] border-[#3b1573]', topBorder: 'border-t-cyan-400',
    headerText: 'text-white/90', headerBtnHover: 'hover:bg-white/10',
    badge: 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30',
    logoFrom: 'from-cyan-400', logoTo: 'to-purple-500', logoShadow: 'shadow-cyan-400/30',
    activeNav: 'bg-[#160431] text-[#8be6ec] font-bold shadow-lg shadow-[#160431]/40 border border-[#4c1d95]/30',
    navLight: 'text-slate-600 font-semibold hover:text-[#1a0538] hover:bg-slate-100',
    pageBg: 'bg-[#160431]', sidebar: 'bg-[#1a0538] border-white/5',
    border: 'border-slate-200', bg50: 'bg-slate-50', bg50s: 'bg-slate-100/50',
    hover50: 'hover:bg-slate-50/70', hover100: 'hover:bg-slate-100',
    iconBg: 'bg-[#2d0e5a]/10', iconBg2: 'bg-[#2d0e5a]/15',
    iconCol: 'text-[#3b1573]', iconColMd: 'text-[#1a0538]', text600: 'text-[#1a0538] font-bold',
    btn: 'bg-gradient-to-r from-[#8be6ec] to-[#6ed8df] hover:from-[#76dee3] text-[#0f2e33] font-bold border-none',
    link: 'text-[#4c1d95] hover:text-[#2d0e5a] font-bold', linkMd: 'text-[#3b1573] font-bold',
    focus: 'focus:ring-[#3b1573]/50 focus:border-[#3b1573]',
    darkSugBox: 'border-slate-200 bg-white shadow-sm',
    darkSugTitle: 'text-[#1a0538] font-bold', darkSugNum: 'bg-[#1a0538] text-white',
    planDarkPro: 'bg-[#2d0e5a]/80 text-cyan-300 border-cyan-400/30',
    planLightPro: 'bg-[#4c1d95]/10 text-[#1a0538] font-bold border-[#4c1d95]/30',
    planLightBasico: 'bg-slate-100 text-slate-700 font-semibold border-slate-200',
    tableHead: 'bg-slate-50 border-slate-200 text-slate-600 font-bold uppercase tracking-wider',
    tableHover: 'hover:bg-slate-50/70',
    msgBubble: 'bg-[#2d0e5a] text-white font-medium rounded-tr-sm',
    todayBg: 'bg-[#1a0538] text-white font-bold', toggleOn: 'bg-cyan-400 border-cyan-400',
    featureOn: 'bg-cyan-400/20 border-cyan-400/40', featureIcon: 'text-[#1a0538]',
    calBorder: 'hover:border-[#4c1d95]/50',
  },
};

const PLANS = ['Básico', 'Pro', 'Enterprise'];

const PLAN_FEATURES: Record<string, Record<string, boolean>> = {
  Básico: { has_dashboard: true, has_chats: true, has_flows: false, has_ads: false, has_integrations: true, has_settings: true },
  Pro: { has_dashboard: true, has_chats: true, has_flows: true, has_ads: false, has_integrations: true, has_settings: true },
  Enterprise: { has_dashboard: true, has_chats: true, has_flows: true, has_ads: true, has_integrations: true, has_settings: true },
};

const FEATURE_LABELS: { key: string; label: string; icon: any }[] = [
  { key: 'has_dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'has_chats', label: 'Leads & Chats', icon: MessageSquare },
  { key: 'has_flows', label: 'Automatizaciones', icon: Workflow },
  { key: 'has_ads', label: 'AnuncIA (Ads)', icon: BarChart3 },
  { key: 'has_integrations', label: 'Integraciones', icon: Blocks },
  { key: 'has_settings', label: 'Configuración', icon: Settings },
];

const ADMIN_MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const ADMIN_WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const NAV_GROUPS = [
  {
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Usuarios',
    items: [
      { key: 'clients', label: 'Clientes', icon: Users },
      { key: 'subadmins', label: 'Sub-admins', icon: UserCog },
    ],
  },
  {
    label: 'Clientes Sellia',
    items: [
      { key: 'kb_simulator', label: 'KB & Simulador', icon: BookMarked },
      { key: 'whatsapp_clients', label: 'WhatsApp Clientes', icon: Smartphone },
      { key: 'history', label: 'Historial de Chats', icon: History },
    ],
  },
  {
    label: 'Sellia IA',
    items: [
      { key: 'chats', label: 'Chats Sellia', icon: MessageSquare },
      { key: 'whatsapp_sellia', label: 'WhatsApp Sellia', icon: Smartphone },
      { key: 'growth', label: 'Sellia Analyzer', icon: Activity },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { key: 'calendar', label: 'Calendario', icon: CalendarIcon },
      { key: 'collections_admin', label: 'Cobranza', icon: DollarSign },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { key: 'ai_config', label: 'Config IA', icon: BrainCircuit },
      { key: 'email_config', label: 'Email & Notificaciones', icon: Bell },
    ],
  },
];

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();


  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalLeads: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', company: '', plan: 'Básico' });
  const [createError, setCreateError] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);

  // Features modal
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFeatures, setEditFeatures] = useState<any>({});

  // Inline plan editing
  const [planDropdown, setPlanDropdown] = useState<number | null>(null);

  // AI Config
  const [aiConfig, setAiConfig] = useState<{ hasKey: boolean; keyPreview: string | null }>({ hasKey: false, keyPreview: null });
  const [aiKeyInput, setAiKeyInput] = useState('');
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiToast, setAiToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── AI Training Chat ─────────────────────────────────────────────────────
  const [trainUserId, setTrainUserId] = useState<number | null>(null);
  const [trainMessages, setTrainMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [trainInput, setTrainInput] = useState('');
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainStatus, setTrainStatus] = useState<string | null>(null);
  const trainEndRef = useRef<HTMLDivElement>(null);

  // ── Knowledge Base Editor ────────────────────────────────────────────────
  const [kbUserId, setKbUserId] = useState<number | null>(null);
  const [kbContent, setKbContent] = useState('');
  const [kbAgentName, setKbAgentName] = useState('Agente IA');
  const [kbLoading, setKbLoading] = useState(false);
  const [kbSaving, setKbSaving] = useState(false);
  const [kbToast, setKbToast] = useState<{ msg: string; ok: boolean } | null>(null);
  // KB Cobranza per-client
  const [kbCollectionTab, setKbCollectionTab] = useState<'ventas' | 'cobranza'>('ventas');
  const [kbCollectionPrompt, setKbCollectionPrompt] = useState('');
  const [kbCollectionSaving, setKbCollectionSaving] = useState(false);

  // ── Growth Analyzer ──────────────────────────────────────────────────────
  const [growthUserId, setGrowthUserId] = useState<number | null>(null);
  const [growthLoading, setGrowthLoading] = useState(false);
  const [growthResult, setGrowthResult] = useState<{
    summary: string; strengths: string[]; weaknesses: string[];
    suggestions: string[]; kbSuggestions: string[]; conversionScore: number;
  } | null>(null);

  // ── Sellia Chats ─────────────────────────────────────────────────────────
  const [selliaSection, setSelliaSection] = useState<'leads' | 'kb' | 'collection_prompt'>('leads');
  const [selliaCollectionPrompt, setSelliaCollectionPrompt] = useState('');
  const [selliaCollectionSaving, setSelliaCollectionSaving] = useState(false);
  const [selliaCollectionToast, setSelliaCollectionToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [selliaLeads, setSelliaLeads] = useState<any[]>([]);
  const [selliaLead, setSelliaLead] = useState<any | null>(null);
  const [selliaMessages, setSelliaMessages] = useState<any[]>([]);
  const [selliaMsgInput, setSelliaMsgInput] = useState('');
  const [selliaSending, setSelliaSending] = useState(false);
  const [selliaAiTyping, setSelliaAiTyping] = useState(false);
  const [selliaHumanMode, setSelliaHumanMode] = useState(false);
  const [selliaKb, setSelliaKb] = useState('');
  const [selliaAgentName, setSelliaAgentName] = useState('Sellia');
  const [selliaKbSaving, setSelliaKbSaving] = useState(false);
  const [selliaKbToast, setSelliaKbToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showNewSelliaLead, setShowNewSelliaLead] = useState(false);
  const [newSelliaLeadName, setNewSelliaLeadName] = useState('');
  const [newSelliaLeadCompany, setNewSelliaLeadCompany] = useState('');
  const [selliaLeadSearch, setSelliaLeadSearch] = useState('');
  const selliaMsgEndRef = useRef<HTMLDivElement>(null);

  // Sidebar navigation
  const [activeSection, setActiveSection] = useState('dashboard');
  // Which nav groups are expanded (all open by default)
  const [navExpanded, setNavExpanded] = useState<Record<string, boolean>>({
    'Usuarios': false, 'Por Cliente': false, 'Sellia IA': false, 'Analytics': false, 'Configuración': true,
  });
  const toggleGroup = (label: string) => setNavExpanded(prev => ({ ...prev, [label]: !prev[label] }));

  // Admin notifications — chat inactivity tracking
  const [adminNotifs, setAdminNotifs] = useState<{
    id: string; leadId: number; leadName: string; clientName: string; clientId: number;
    status: string; lastMessage: string; messageCount: number; channel: string;
    timestamp: string; read: boolean;
  }[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifToast, setNotifToast] = useState<any | null>(null);
  const seenLeadActivity = useRef<Record<string, string>>({});
  const notifToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calendar
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calCurrentDate, setCalCurrentDate] = useState(new Date());
  const [showCalModal, setShowCalModal] = useState(false);
  const [calForm, setCalForm] = useState({ title: '', description: '', start_datetime: '', end_datetime: '', type: 'meeting' });
  const [calSaving, setCalSaving] = useState(false);
  const [googleCalStatus, setGoogleCalStatus] = useState<{ connected: boolean }>({ connected: false });
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [calToast, setCalToast] = useState<{ ok: boolean; text: string } | null>(null);

  // WhatsApp per client
  const [waClientId, setWaClientId] = useState<number | null>(null);
  const [waConfig, setWaConfig] = useState({ phoneNumberId: '', accessToken: '', businessAccountId: '', displayName: '' });
  const [waConfigSaved, setWaConfigSaved] = useState<any | null>(null);
  const [waSaving, setWaSaving] = useState(false);
  const [waToast, setWaToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [waLoading, setWaLoading] = useState(false);

  const [selliaWaConfig, setSelliaWaConfig] = useState({ phoneNumberId: '', accessToken: '', businessAccountId: '', displayName: '' });
  const [selliaWaConfigSaved, setSelliaWaConfigSaved] = useState<any | null>(null);
  const [selliaWaSaving, setSelliaWaSaving] = useState(false);
  const [selliaWaToast, setSelliaWaToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Chat history
  const [histUserId, setHistUserId] = useState<number | null>(null);
  const [histLeads, setHistLeads] = useState<any[]>([]);
  const [histLead, setHistLead] = useState<any | null>(null);
  const [histMessages, setHistMessages] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histMsgLoading, setHistMsgLoading] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);
  const histEndRef = useRef<HTMLDivElement>(null);

  // Sub-admins
  const [subAdmins, setSubAdmins] = useState<any[]>([]);
  const [showCreateSubAdmin, setShowCreateSubAdmin] = useState(false);
  const [newSubAdmin, setNewSubAdmin] = useState({ email: '', password: '', name: '', company: '' });
  const [subAdminError, setSubAdminError] = useState('');
  const [subAdminSaving, setSubAdminSaving] = useState(false);

  // Email / SMTP config
  const [smtp, setSmtp] = useState({ host: '', port: '587', secure: false, user: '', pass: '', fromName: 'Sellia', fromEmail: '', enabled: false });
  const [adminCollections, setAdminCollections] = useState<any[]>([]);
  const [adminCollectionsLoading, setAdminCollectionsLoading] = useState(false);
  const [adminSchedulerRunning, setAdminSchedulerRunning] = useState(false);
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpToast, setSmtpToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');

  // Sellia Analyzer per client
  const [analyzerClientId, setAnalyzerClientId] = useState<number | null>(null);
  const [analyzerStats, setAnalyzerStats] = useState<any | null>(null);
  const [analyzerStatsLoading, setAnalyzerStatsLoading] = useState(false);

  // Fixed sellia accent — no theme picker
  const accentColor: ThemeKey = 'sellia';

  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('admin_darkmode');
    return stored ? stored === 'dark' : true; // defaults to dark
  });

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('admin_darkmode', next ? 'dark' : 'light');
  };

  const dm = darkMode;
  const T = ADMIN_THEMES[accentColor];

  // Plan color badges (theme-aware)
  const PLAN_COLORS_DARK: Record<string, string> = {
    Básico: 'bg-slate-700 text-slate-200 border-slate-600',
    Pro: T.planDarkPro,
    Enterprise: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };
  const PLAN_COLORS_LIGHT: Record<string, string> = {
    Básico: T.planLightBasico,
    Pro: T.planLightPro,
    Enterprise: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  // Calendar helpers
  const prevMonth = () => { const d = new Date(calCurrentDate); d.setMonth(d.getMonth() - 1); setCalCurrentDate(d); };
  const nextMonth = () => { const d = new Date(calCurrentDate); d.setMonth(d.getMonth() + 1); setCalCurrentDate(d); };

  const loadCalendarEvents = async () => {
    setCalendarLoading(true);
    try {
      const y = calCurrentDate.getFullYear();
      const m = String(calCurrentDate.getMonth() + 1).padStart(2, '0');
      const data = await api.getCalendarEvents({ month: `${y}-${m}` });
      setCalendarEvents(data);
    } catch { } finally { setCalendarLoading(false); }
  };

  const createCalEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalSaving(true);
    try {
      await api.createCalendarEvent({
        title: calForm.title,
        description: calForm.description,
        start_datetime: calForm.start_datetime + ':00',
        end_datetime: calForm.end_datetime + ':00',
        type: calForm.type,
      });
      setShowCalModal(false);
      loadCalendarEvents();
    } catch (err: any) { alert(err.message); }
    finally { setCalSaving(false); }
  };

  const deleteCalEvent = async (id: number) => {
    if (!confirm('¿Eliminar este evento?')) return;
    try {
      await api.deleteCalendarEvent(id);
      setCalendarEvents(prev => prev.filter(ev => ev.id !== id));
    } catch (err: any) { setCalToast({ ok: false, text: err.message }); }
  };

  const showCalToast = (ok: boolean, text: string) => {
    setCalToast({ ok, text });
    setTimeout(() => setCalToast(null), 4000);
  };

  const handleConnectGoogle = async () => {
    try {
      const { authUrl } = await api.getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (err: any) { showCalToast(false, err.message); }
  };

  const handleSyncGoogle = async () => {
    setGcalSyncing(true);
    try {
      const result = await api.syncGoogleCalendar();
      showCalToast(true, result.message);
      loadCalendarEvents();
      api.getGoogleCalendarStatus().then(setGoogleCalStatus).catch(() => {});
    } catch (err: any) { showCalToast(false, err.message); }
    finally { setGcalSyncing(false); }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('¿Desconectar Google Calendar? Los eventos importados quedarán en Sellia.')) return;
    try {
      await api.disconnectGoogleCalendar();
      setGoogleCalStatus({ connected: false });
      showCalToast(true, 'Google Calendar desconectado.');
    } catch (err: any) { showCalToast(false, err.message); }
  };

  const getAdminMonthDays = () => {
    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  };

  const getEventsForDay = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    return calendarEvents.filter(ev => ev.start_datetime.startsWith(dateStr));
  };

  const showAiMsg = (msg: string, ok: boolean) => {
    setAiToast({ msg, ok });
    setTimeout(() => setAiToast(null), 3500);
  };

  const handleSaveAiKey = async () => {
    if (!aiKeyInput.trim()) return;
    setAiSaving(true);
    try {
      await api.adminUpdateAiConfig(aiKeyInput.trim());
      const cfg = await api.adminGetAiConfig();
      setAiConfig(cfg);
      setAiKeyInput('');
      showAiMsg('Clave de OpenAI guardada. Todos los clientes ya tienen IA activa.', true);
    } catch (err: any) {
      showAiMsg(err.message || 'Error al guardar la clave', false);
    } finally {
      setAiSaving(false);
    }
  };

  const handleRemoveAiKey = async () => {
    if (!confirm('¿Eliminar la clave de OpenAI? La IA dejará de funcionar para todos los clientes.')) return;
    setAiSaving(true);
    try {
      await api.adminDeleteAiConfig();
      setAiConfig({ hasKey: false, keyPreview: null });
      showAiMsg('Clave eliminada correctamente.', true);
    } catch (err: any) {
      showAiMsg(err.message || 'Error al eliminar', false);
    } finally {
      setAiSaving(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([api.adminGetStats(), api.adminGetUsers()]);
      setStats(s);
      setUsers(u);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    api.adminGetAiConfig().then(setAiConfig).catch(console.error);
    loadSelliaLeads();
    api.adminGetSelliaKb().then(d => { setSelliaKb(d.content); setSelliaAgentName(d.agentName); }).catch(() => { });
    api.adminGetSelliaCollectionPrompt().then(d => setSelliaCollectionPrompt(d.collection_prompt || '')).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeSection === 'calendar') {
      loadCalendarEvents();
      api.getGoogleCalendarStatus().then(setGoogleCalStatus).catch(() => {});
    }
    if (activeSection === 'collections_admin') {
      setAdminCollectionsLoading(true);
      api.getAllCollections().then(d => setAdminCollections(d)).catch(() => {}).finally(() => setAdminCollectionsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, calCurrentDate.toISOString().substring(0, 7)]);

  // Poll messages every 3s for active Sellia lead
  useEffect(() => {
    if (!selliaLead) return;
    const poll = setInterval(async () => {
      try {
        const msgs = await api.getMessages(selliaLead.id);
        setSelliaMessages(msgs);
      } catch { }
    }, 3000);
    return () => clearInterval(poll);
  }, [selliaLead?.id]);

  // Poll Sellia leads list every 15s
  useEffect(() => {
    if (activeSection !== 'chats') return;
    const poll = setInterval(loadSelliaLeads, 15000);
    return () => clearInterval(poll);
  }, [activeSection]);

  // Load WhatsApp config for a client
  const loadWaConfig = async (userId: number) => {
    setWaLoading(true);
    setWaClientId(userId);
    try {
      const config = await api.adminGetUserWhatsapp(userId);
      setWaConfigSaved(config);
      setWaConfig({
        phoneNumberId: config.phoneNumberId || '',
        accessToken: '',
        businessAccountId: config.businessAccountId || '',
        displayName: config.displayName || '',
      });
    } catch { }
    setWaLoading(false);
  };

  const saveWaConfig = async () => {
    if (!waClientId) return;
    setWaSaving(true);
    try {
      const result = await api.adminSaveUserWhatsapp(waClientId, waConfig);
      setWaToast({ msg: `✓ WhatsApp configurado. Verify token: ${result.verifyToken}`, ok: true });
      setWaConfigSaved({ ...waConfig, configured: true, verifyToken: result.verifyToken });
      setTimeout(() => setWaToast(null), 6000);
    } catch (e: any) {
      setWaToast({ msg: e.message, ok: false });
      setTimeout(() => setWaToast(null), 4000);
    }
    setWaSaving(false);
  };

  const loadSelliaWaConfig = async () => {
    try {
      const config = await api.adminGetSelliaWhatsapp();
      setSelliaWaConfigSaved(config);
      setSelliaWaConfig({ phoneNumberId: config.phoneNumberId || '', accessToken: '', businessAccountId: config.businessAccountId || '', displayName: config.displayName || '' });
    } catch {}
  };

  const saveSelliaWaConfig = async () => {
    setSelliaWaSaving(true);
    try {
      const result = await api.adminSaveSelliaWhatsapp(selliaWaConfig);
      setSelliaWaToast({ msg: `✓ WhatsApp Sellia configurado. Verify token: ${result.verifyToken}`, ok: true });
      setSelliaWaConfigSaved({ ...selliaWaConfig, configured: true, verifyToken: result.verifyToken });
      setTimeout(() => setSelliaWaToast(null), 6000);
    } catch (e: any) {
      setSelliaWaToast({ msg: e.message, ok: false });
      setTimeout(() => setSelliaWaToast(null), 4000);
    }
    setSelliaWaSaving(false);
  };

  const saveSmtp = async () => {
    setSmtpSaving(true);
    try {
      await api.updateSmtpConfig({ ...smtp, port: Number(smtp.port) });
      setSmtpToast({ msg: '✓ Configuración SMTP guardada.', ok: true });
    } catch (e: any) {
      setSmtpToast({ msg: e.message || 'Error al guardar', ok: false });
    }
    setSmtpSaving(false);
    setTimeout(() => setSmtpToast(null), 4000);
  };

  const testSmtp = async () => {
    if (!smtpTestEmail || !smtpTestEmail.includes('@')) {
      setSmtpToast({ msg: 'Ingresa un email de destino para la prueba.', ok: false });
      setTimeout(() => setSmtpToast(null), 4000);
      return;
    }
    setSmtpTesting(true);
    try {
      const r = await api.testSmtp(smtpTestEmail);
      setSmtpToast({ msg: r.message || '✓ Email de prueba enviado.', ok: true });
    } catch (e: any) {
      setSmtpToast({ msg: e.message || 'Error al enviar email de prueba', ok: false });
    }
    setSmtpTesting(false);
    setTimeout(() => setSmtpToast(null), 5000);
  };

  // Load chat history for a client
  const loadHistLeads = async (userId: number) => {
    setHistUserId(userId);
    setHistLead(null);
    setHistMessages([]);
    setHistLeads([]);
    setHistError(null);
    setHistLoading(true);
    try {
      const leads = await api.adminGetUserLeads(userId);
      setHistLeads(Array.isArray(leads) ? leads : []);
    } catch (e: any) {
      setHistError(e?.message || 'Error al cargar leads');
    }
    setHistLoading(false);
  };

  const loadHistMessages = async (leadId: number) => {
    if (!histUserId) return;
    setHistMsgLoading(true);
    try {
      const data = await api.adminGetLeadMessages(histUserId, leadId);
      setHistLead(data.lead);
      setHistMessages(data.messages);
      setTimeout(() => histEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { }
    setHistMsgLoading(false);
  };

  const loadSubAdmins = async () => {
    try {
      const all = await api.adminGetUsers();
      setSubAdmins(all.filter((u: any) => u.role === 'subadmin'));
    } catch { }
  };

  const createSubAdmin = async () => {
    if (!newSubAdmin.email || !newSubAdmin.password) {
      setSubAdminError('Email y contraseña son obligatorios');
      return;
    }
    setSubAdminSaving(true);
    setSubAdminError('');
    try {
      await api.adminCreateUser({ ...newSubAdmin, plan: 'Básico', role: 'subadmin' });
      setShowCreateSubAdmin(false);
      setNewSubAdmin({ email: '', password: '', name: '', company: '' });
      loadSubAdmins();
    } catch (e: any) {
      setSubAdminError(e.message);
    }
    setSubAdminSaving(false);
  };

  const loadAnalyzerStats = async (userId: number) => {
    setAnalyzerClientId(userId);
    setAnalyzerStatsLoading(true);
    try {
      const stats = await api.adminGetUserStats(userId);
      setAnalyzerStats(stats);
    } catch { }
    setAnalyzerStatsLoading(false);
  };

  const exportAnalyzerPDF = () => {
    if (!analyzerStats || !analyzerClientId) return;
    const client = users.find(u => u.id === analyzerClientId);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Sellia Analyzer - ${client?.name || ''}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#1e293b;} h1{color:#0f172a;} table{width:100%;border-collapse:collapse;} td,th{border:1px solid #e2e8f0;padding:8px;text-align:left;} tr:nth-child(even){background:#f8fafc;}</style>
      </head><body>
      <h1>Sellia Analyzer — ${client?.name || ''} (${client?.company || ''})</h1>
      <p>Reporte generado: ${new Date().toLocaleDateString('es-ES')}</p>
      <h2>KPIs</h2>
      <table>
        <tr><th>Métrica</th><th>Valor</th></tr>
        <tr><td>Total Leads</td><td>${analyzerStats.totalLeads}</td></tr>
        <tr><td>Cerrados Ganados</td><td>${analyzerStats.closedWon}</td></tr>
        <tr><td>Cerrados Perdidos</td><td>${analyzerStats.closedLost}</td></tr>
        <tr><td>En Negociación</td><td>${analyzerStats.inNegotiation}</td></tr>
        <tr><td>Calificados</td><td>${analyzerStats.qualified}</td></tr>
        <tr><td>Nuevos</td><td>${analyzerStats.newLeads}</td></tr>
        <tr><td>Tasa de Conversión</td><td>${analyzerStats.conversionRate}%</td></tr>
        <tr><td>Total Mensajes</td><td>${analyzerStats.totalMessages}</td></tr>
        <tr><td>Automatizaciones</td><td>${analyzerStats.automations}</td></tr>
      </table>
      <h2>Leads Recientes</h2>
      <table>
        <tr><th>Nombre</th><th>Estado</th><th>Canal</th><th>Score</th></tr>
        ${(analyzerStats.recentLeads || []).map((l: any) => `<tr><td>${l.name}</td><td>${l.status}</td><td>${l.channel}</td><td>${l.score || '-'}</td></tr>`).join('')}
      </table>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const exportAnalyzerCSV = () => {
    if (!analyzerStats || !analyzerClientId) return;
    const client = users.find(u => u.id === analyzerClientId);
    const rows = [
      ['Sellia Analyzer', client?.name || '', client?.company || ''],
      [],
      ['Métrica', 'Valor'],
      ['Total Leads', analyzerStats.totalLeads],
      ['Cerrados Ganados', analyzerStats.closedWon],
      ['Cerrados Perdidos', analyzerStats.closedLost],
      ['En Negociación', analyzerStats.inNegotiation],
      ['Calificados', analyzerStats.qualified],
      ['Nuevos', analyzerStats.newLeads],
      ['Tasa de Conversión (%)', analyzerStats.conversionRate],
      ['Total Mensajes', analyzerStats.totalMessages],
      ['Automatizaciones', analyzerStats.automations],
      [],
      ['Lead', 'Estado', 'Canal', 'Score'],
      ...(analyzerStats.recentLeads || []).map((l: any) => [l.name, l.status, l.channel, l.score || '']),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analyzer-${client?.name || 'cliente'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { loadSubAdmins(); }, []);

  useEffect(() => {
    api.getSmtpConfig().then(setSmtp).catch(() => {});
  }, []);

  // Poll for chat inactivity notifications
  useEffect(() => {
    const checkInactivity = async () => {
      try {
        const recentLeads = await api.adminGetRecentLeads();
        const now = Date.now();
        const ONE_MIN = 60_000;

        for (const lead of recentLeads) {
          if (!lead.last_message_at) continue;
          const lastActivity = new Date(lead.last_message_at).getTime();
          const idle = now - lastActivity;
          const key = `${lead.id}`;
          const prevSeen = seenLeadActivity.current[key];

          if (idle > ONE_MIN && idle < 5 * 60_000 && prevSeen !== lead.last_message_at && lead.message_count > 0) {
            const notif = {
              id: `${lead.id}-${lead.last_message_at}`,
              leadId: lead.id,
              leadName: lead.name || 'Lead sin nombre',
              clientName: lead.client_name || lead.client_company || 'Cliente',
              clientId: lead.user_id,
              status: lead.status || 'Nuevo',
              lastMessage: lead.last_message || '',
              messageCount: lead.message_count || 0,
              channel: lead.channel || 'WhatsApp',
              timestamp: lead.last_message_at,
              read: false,
            };

            setAdminNotifs(prev => {
              if (prev.some(n => n.id === notif.id)) return prev;
              return [notif, ...prev].slice(0, 20);
            });

            setNotifToast(notif);
            if (notifToastTimeout.current) clearTimeout(notifToastTimeout.current);
            notifToastTimeout.current = setTimeout(() => setNotifToast(null), 8000);

            seenLeadActivity.current[key] = lead.last_message_at;
          } else if (idle <= ONE_MIN) {
            seenLeadActivity.current[key] = lead.last_message_at;
          }
        }
      } catch { }
    };

    const interval = setInterval(checkInactivity, 30_000);
    return () => {
      clearInterval(interval);
      if (notifToastTimeout.current) clearTimeout(notifToastTimeout.current);
    };
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleToggleActive = async (u: any) => {
    const updated = await api.adminUpdateUser(u.id, { is_active: u.is_active ? 0 : 1 });
    setUsers(users.map(x => x.id === u.id ? { ...x, ...updated } : x));
  };

  const handlePlanChange = async (u: any, plan: string) => {
    const features = PLAN_FEATURES[plan];
    const updated = await api.adminUpdateUser(u.id, { plan, ...features });
    setUsers(users.map(x => x.id === u.id ? { ...x, ...updated } : x));
    setPlanDropdown(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este usuario y todos sus datos permanentemente?')) return;
    await api.adminDeleteUser(id);
    setUsers(users.filter(u => u.id !== id));
    loadData();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setSaving(true);
    try {
      const created = await api.adminCreateUser(newUser);
      setUsers([created, ...users]);
      setShowCreate(false);
      setNewUser({ email: '', password: '', name: '', company: '', plan: 'Básico' });
      loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  const openFeatures = (u: any) => {
    setEditingUser(u);
    setEditFeatures({
      has_dashboard: !!u.has_dashboard,
      has_chats: !!u.has_chats,
      has_flows: !!u.has_flows,
      has_ads: !!u.has_ads,
      has_integrations: !!u.has_integrations,
      has_settings: !!u.has_settings,
      plan: u.plan,
    });
  };

  const handleSaveFeatures = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const updated = await api.adminUpdateUser(editingUser.id, editFeatures);
      setUsers(users.map(x => x.id === editingUser.id ? { ...x, ...updated } : x));
      setEditingUser(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Sellia Chats functions ───────────────────────────────────────────────
  const loadSelliaLeads = async () => {
    try {
      const leads = await api.getLeads();
      setSelliaLeads(leads);
    } catch { }
  };

  const selectSelliaLead = async (lead: any) => {
    setSelliaLead(lead);
    setSelliaHumanMode(!!lead.human_mode);
    setSelliaMessages([]);
    try {
      const msgs = await api.getMessages(lead.id);
      setSelliaMessages(msgs);
      setTimeout(() => selliaMsgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch { }
  };

  const triggerSelliaAI = async (allMessages: any[]) => {
    if (!selliaLead) return;
    setSelliaAiTyping(true);
    try {
      const res = await api.aiChat({ leadId: selliaLead.id, messages: allMessages });
      const parts = res.parts || [res.content];
      for (const part of parts) {
        setSelliaMessages(prev => [...prev, { role: 'assistant', content: part, source: 'bot' }]);
      }
      if (res.newStatus && res.newStatus !== 'Nuevo') {
        setSelliaLead((prev: any) => ({ ...prev, status: res.newStatus }));
        setSelliaLeads(prev => prev.map(l => l.id === selliaLead.id ? { ...l, status: res.newStatus } : l));
      }
    } catch (err: any) {
      setSelliaMessages(prev => [...prev, { role: 'assistant', content: '❌ Error IA: ' + err.message, source: 'bot' }]);
    } finally {
      setSelliaAiTyping(false);
      setTimeout(() => selliaMsgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const sendSelliaMessage = async () => {
    if (!selliaLead || !selliaMsgInput.trim() || selliaSending) return;
    const text = selliaMsgInput.trim();
    setSelliaMsgInput('');
    setSelliaSending(true);
    try {
      // Always send as operator to the WhatsApp contact (like Chats.tsx)
      await api.sendWhatsappOperatorMessage(selliaLead.id, text);
      const newMsg = { role: 'assistant', content: text, source: 'human' };
      setSelliaMessages(prev => [...prev, newMsg]);
    } catch (err: any) {
      setSelliaMessages(prev => [...prev, { role: 'assistant', content: '❌ ' + err.message, source: 'bot' }]);
    } finally {
      setSelliaSending(false);
      setTimeout(() => selliaMsgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  const createSelliaLead = async () => {
    if (!newSelliaLeadName.trim()) return;
    try {
      const lead = await api.createLead({
        name: newSelliaLeadName.trim(),
        company: newSelliaLeadCompany.trim() || '',
        channel: 'Web',
        status: 'Nuevo',
      });
      setSelliaLeads(prev => [lead, ...prev]);
      setNewSelliaLeadName('');
      setNewSelliaLeadCompany('');
      setShowNewSelliaLead(false);
      selectSelliaLead(lead);
    } catch { }
  };

  const deleteSelliaLead = async (leadId: number) => {
    if (!confirm('¿Eliminar esta conversación permanentemente?')) return;
    try {
      await api.deleteLead(leadId);
      setSelliaLeads(prev => prev.filter(l => l.id !== leadId));
      if (selliaLead?.id === leadId) { setSelliaLead(null); setSelliaMessages([]); }
    } catch { }
  };

  const toggleSelliaHumanMode = async () => {
    if (!selliaLead) return;
    const next = !selliaHumanMode;
    setSelliaHumanMode(next);
    await api.updateLead(selliaLead.id, { human_mode: next ? 1 : 0 });
  };

  const statCards = [
    { label: 'Clientes Totales', value: stats.totalUsers, icon: Users, color: 'text-amber-500', bg: dm ? 'bg-amber-500/10' : 'bg-amber-100' },
    { label: 'Clientes Activos', value: stats.activeUsers, icon: TrendingUp, color: 'text-emerald-500', bg: dm ? 'bg-emerald-500/10' : 'bg-emerald-100' },
    { label: 'Leads Gestionados', value: stats.totalLeads.toLocaleString(), icon: MessageSquare, color: 'text-blue-400', bg: dm ? 'bg-blue-500/10' : 'bg-blue-100' },
    { label: 'Revenue Total', value: `$${Number(stats.totalRevenue || 0).toLocaleString('es', { minimumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-amber-500', bg: dm ? 'bg-amber-500/10' : 'bg-amber-100' },
  ];

  // Shared class helpers
  const card = cn("rounded-xl border", dm ? "bg-slate-800/50 border-slate-700/80" : "bg-white shadow-sm border-slate-200");
  const inputCls = cn("w-full px-3 py-2 rounded-lg text-sm placeholder:opacity-50 outline-none border transition-colors",
    T.focus,
    dm ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
      : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400");

  return (
    <div className={cn("min-h-screen", dm ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900")}>

      {/* Header — siempre oscuro, look empresarial */}
      <header className={cn("flex items-center justify-between px-6 sticky top-0 z-40 h-20 sm:h-24 border-b", T.header)}>
        <div className="flex items-center gap-5">
          <img 
            src={logoUrl} 
            alt="Sellia Logo" 
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(139,230,236,0.25)] transition-all transform scale-125 origin-left" 
          />
          <div className="flex items-center">
            <span className={cn("text-xs sm:text-sm font-bold px-3 py-1 sm:py-1.5 rounded uppercase tracking-widest", T.badge || "bg-slate-700 text-slate-200")}>
              Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifPanel(p => !p)}
              className="p-2 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-slate-800 relative"
              title="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              {adminNotifs.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
              )}
            </button>
            {showNotifPanel && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Notificaciones de Chat
                  </span>
                  <button onClick={() => { setAdminNotifs(p => p.map(n => ({ ...n, read: true }))); }} className="text-xs text-slate-400 hover:text-white">
                    Marcar todas
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                  {adminNotifs.length === 0 ? (
                    <p className="px-4 py-6 text-center text-slate-500 text-sm">Sin notificaciones</p>
                  ) : adminNotifs.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setAdminNotifs(p => p.map(x => x.id === n.id ? { ...x, read: true } : x));
                        setShowNotifPanel(false);
                        setActiveSection('history');
                      }}
                      className={cn(
                        "px-4 py-3 cursor-pointer transition-colors hover:bg-slate-800",
                        !n.read ? "bg-slate-800/40" : ""
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0"></span>}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-white truncate">{n.leadName}</span>
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                              n.status === 'Cerrado Ganado' ? 'bg-emerald-500/20 text-emerald-400' :
                                n.status === 'En Negociación' ? 'bg-purple-500/20 text-purple-400' :
                                  n.status === 'Calificado' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-slate-700 text-slate-300'
                            )}>{n.status}</span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{n.clientName} · {n.channel}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">"{n.lastMessage}"</p>
                          <p className="text-xs text-slate-600 mt-0.5">{n.messageCount} mensajes · {new Date(n.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
            title="Actualizar datos"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-slate-800"
            title={dm ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            {dm ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="w-px h-5 mx-1 bg-slate-700" />

          <div className="text-right">
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-56px)]">
        {/* Sidebar — oscuro en dark mode, blanco limpio en light mode */}
        <aside className={cn(
          "w-56 shrink-0 border-r flex flex-col",
          dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}>
          <nav className="flex-1 py-3 px-2.5 mt-1 overflow-y-auto space-y-0.5">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className={group.label ? "mb-1" : ""}>
                {group.label ? (
                  <>
                    {/* Dropdown header */}
                    <button
                      onClick={() => toggleGroup(group.label!)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors",
                        dm ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span>{group.label}</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", navExpanded[group.label] ? "rotate-0" : "-rotate-90")} />
                    </button>
                    {/* Collapsible items */}
                    {navExpanded[group.label] && (
                      <div className="mt-0.5 space-y-0.5">
                        {group.items.map(item => (
                          <button
                            key={item.key}
                            onClick={() => { setActiveSection(item.key); if (item.key === 'whatsapp_sellia') loadSelliaWaConfig(); }}
                            className={cn(
                              "w-full flex items-center gap-2.5 pl-5 pr-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                              activeSection === item.key
                                ? "bg-slate-700 text-white shadow-sm"
                                : dm
                                  ? "text-slate-400 hover:text-white hover:bg-slate-800"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* Top-level items with no group (Dashboard) */
                  group.items.map(item => (
                    <button
                      key={item.key}
                      onClick={() => setActiveSection(item.key)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                        activeSection === item.key
                          ? "bg-slate-700 text-white shadow-sm"
                          : dm
                            ? "text-slate-400 hover:text-white hover:bg-slate-800"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </button>
                  ))
                )}
              </div>
            ))}
          </nav>

          <div className={cn("px-4 py-3 border-t text-xs font-medium", dm ? "border-slate-800 text-slate-600" : "border-slate-100 text-slate-400")}>
            Panel de Administración
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-8 space-y-6">

            {/* Dashboard */}
            {activeSection === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={cn("text-2xl font-bold", dm ? "text-white" : "text-slate-900")}>Dashboard</h2>
                    <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>
                      Resumen estratégico de Sellia — {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={loadData} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors", dm ? "border-slate-700 text-slate-400 hover:bg-slate-800" : cn(T.border, "text-slate-500", T.hover50))}>
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Actualizar
                  </button>
                </div>

                {/* Primary KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {statCards.map((c) => (
                    <div key={c.label} className={cn(card, "p-5 flex flex-col gap-3")}>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-sm font-medium", dm ? "text-slate-400" : "text-slate-500")}>{c.label}</span>
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", c.bg)}>
                          <c.icon className={cn("w-5 h-5", c.color)} />
                        </div>
                      </div>
                      <p className={cn("text-3xl font-bold tracking-tight", dm ? "text-white" : "text-slate-900")}>{loading ? '—' : c.value}</p>
                    </div>
                  ))}
                </div>

                {/* Plan distribution + Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Plan breakdown */}
                  <div className={cn(card, "p-5 space-y-4")}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", T.iconBg)}>
                        <BarChart3 className={cn("w-4 h-4", T.iconCol)} />
                      </div>
                      <div>
                        <p className={cn("text-sm font-semibold", dm ? "text-white" : "text-slate-900")}>Distribución de Planes</p>
                        <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-500")}>Ingresos por segmento</p>
                      </div>
                    </div>
                    {loading ? <div className="h-20 animate-pulse rounded-lg bg-slate-700/30" /> : (
                      <div className="space-y-3">
                        {[
                          { label: 'Enterprise', price: 199, color: 'bg-amber-500', textColor: 'text-amber-400', count: users.filter(u => u.plan === 'Enterprise').length },
                          { label: 'Pro', price: 99, color: T.btn.split(' ')[0], textColor: "text-slate-400", count: users.filter(u => u.plan === 'Pro').length },
                          { label: 'Básico', price: 49, color: 'bg-slate-500', textColor: 'text-slate-400', count: users.filter(u => u.plan === 'Básico').length },
                        ].map(p => (
                          <div key={p.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn("text-xs font-medium", dm ? "text-slate-300" : "text-slate-700")}>{p.label}</span>
                              <span className={cn("text-xs font-bold", p.textColor)}>{p.count} clientes · ${p.price * p.count}/mes</span>
                            </div>
                            <div className={cn("h-1.5 rounded-full", dm ? "bg-slate-800" : T.bg50)}>
                              <div className={cn("h-1.5 rounded-full transition-all", p.color)} style={{ width: users.length ? `${Math.round(p.count / users.length * 100)}%` : '0%' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Health metrics */}
                  <div className={cn(card, "p-5 space-y-4")}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className={cn("text-sm font-semibold", dm ? "text-white" : "text-slate-900")}>Salud de la Plataforma</p>
                        <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-500")}>Indicadores clave</p>
                      </div>
                    </div>
                    {loading ? <div className="h-20 animate-pulse rounded-lg bg-slate-700/30" /> : (
                      <div className="space-y-2.5">
                        {[
                          { label: 'Tasa de activación', value: users.length ? `${Math.round(stats.activeUsers / users.length * 100)}%` : '0%', ok: true },
                          { label: 'MRR estimado', value: `$${users.reduce((acc, u) => acc + (u.plan === 'Enterprise' ? 199 : u.plan === 'Pro' ? 99 : 49), 0).toLocaleString()}/mes`, ok: true },
                          { label: 'Clientes inactivos', value: `${users.filter(u => !u.is_active).length}`, ok: users.filter(u => !u.is_active).length === 0 },
                          { label: 'Leads totales gestionados', value: stats.totalLeads.toLocaleString(), ok: true },
                        ].map(m => (
                          <div key={m.label} className="flex items-center justify-between">
                            <span className={cn("text-xs", dm ? "text-slate-400" : "text-slate-500")}>{m.label}</span>
                            <span className={cn("text-xs font-bold", m.ok ? "text-emerald-400" : "text-rose-400")}>{m.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className={cn(card, "p-5 space-y-4")}>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className={cn("text-sm font-semibold", dm ? "text-white" : "text-slate-900")}>Acciones Rápidas</p>
                        <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-500")}>Atajos frecuentes</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Nuevo cliente', icon: Users, section: 'clients', action: () => { setActiveSection('clients'); setShowCreate(true); } },
                        { label: 'Editar KB de cliente', icon: BookMarked, section: 'knowledge', action: () => setActiveSection('knowledge') },
                        { label: 'Simular conversación', icon: Bot, section: 'simulator', action: () => setActiveSection('simulator') },
                        { label: 'Analizar cliente', icon: Activity, section: 'growth', action: () => setActiveSection('growth') },
                      ].map(a => (
                        <button key={a.label} onClick={a.action} className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors border", dm ? "border-slate-800 hover:bg-slate-800 text-slate-300" : cn(T.border, T.hover50, "text-slate-700"))}>
                          <a.icon className={cn("w-4 h-4 shrink-0", T.iconCol)} />
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Clients overview table (mini) */}
                <div className={cn(card, "overflow-hidden")}>
                  <div className={cn("px-6 py-4 border-b flex items-center justify-between", dm ? "border-slate-800" : T.border)}>
                    <p className={cn("font-semibold text-sm", dm ? "text-white" : "text-slate-900")}>Últimos Clientes Registrados</p>
                    <button onClick={() => setActiveSection('clients')} className={cn("text-xs transition-colors", T.link)}>Ver todos →</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className={cn("border-b text-xs uppercase", dm ? "bg-slate-800/60 border-slate-700 text-slate-400" : T.tableHead)}>
                        <tr>
                          <th className="px-6 py-3 text-left font-medium">Cliente</th>
                          <th className="px-6 py-3 text-left font-medium">Plan</th>
                          <th className="px-6 py-3 text-left font-medium">Leads</th>
                          <th className="px-6 py-3 text-left font-medium">Estado</th>
                          <th className="px-6 py-3 text-left font-medium">Registro</th>
                        </tr>
                      </thead>
                      <tbody className={cn("divide-y", dm ? "divide-slate-800" : "divide-slate-100")}>
                        {loading ? (
                          <tr><td colSpan={5} className="px-6 py-8 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-500" /></td></tr>
                        ) : users.filter(u => u.role !== 'superadmin' && u.role !== 'subadmin').slice(0, 5).map(u => (
                          <tr key={u.id} className={cn("transition-colors", dm ? "hover:bg-slate-800/40" : T.hover50)}>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0", T.iconBg, T.iconCol)}>
                                  {(u.name || u.email).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className={cn("font-medium text-sm", dm ? "text-white" : "text-slate-900")}>{u.name || u.email}</p>
                                  <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-500")}>{u.company || 'Sin empresa'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <span className={cn("text-xs px-2 py-1 rounded-full border font-medium", dm ? PLAN_COLORS_DARK[u.plan] : PLAN_COLORS_LIGHT[u.plan])}>
                                {u.plan}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <span className={cn("text-sm font-semibold", dm ? "text-white" : "text-slate-900")}>{u.leads_count}</span>
                              <span className={cn("text-xs ml-1", dm ? "text-slate-500" : "text-slate-500")}>leads</span>
                            </td>
                            <td className="px-6 py-3">
                              <span className={cn("flex items-center gap-1.5 text-xs font-medium", u.is_active ? "text-emerald-500" : dm ? "text-slate-400" : "text-slate-500")}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", u.is_active ? "bg-emerald-500" : "bg-zinc-400")} />
                                {u.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <span className={cn("text-xs", dm ? "text-slate-400" : "text-slate-500")}>
                                {u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Clients section */}
            {activeSection === 'clients' && (
              <div className={cn(card, "overflow-hidden")}>
                <div className={cn("p-6 border-b flex justify-between items-center", dm ? "border-slate-800" : T.border)}>
                  <div>
                    <h2 className={cn("font-semibold text-lg", dm ? "text-white" : "text-slate-900")}>Clientes</h2>
                    <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>{users.filter(u => u.role !== 'superadmin' && u.role !== 'subadmin').length} usuarios registrados</p>
                  </div>
                  <button
                    onClick={() => setShowCreate(true)}
                    className={cn("flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors", T.btn)}
                  >
                    <Plus className="w-4 h-4" /> Nuevo Cliente
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={cn("border-b text-xs uppercase", dm ? "bg-slate-800/60 border-slate-700 text-slate-400" : T.tableHead)}>
                      <tr>
                        <th className="px-6 py-3 text-left font-medium">Cliente</th>
                        <th className="px-6 py-3 text-left font-medium">Plan</th>
                        <th className="px-6 py-3 text-left font-medium">Datos</th>
                        <th className="px-6 py-3 text-left font-medium">Estado</th>
                        <th className="px-6 py-3 text-left font-medium">Módulos</th>
                        <th className="px-6 py-3 text-right font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className={cn("divide-y", dm ? "divide-slate-800" : "divide-slate-100")}>
                      {loading ? (
                        <tr>
                          <td colSpan={6} className={cn("px-6 py-12 text-center", dm ? "text-slate-500" : "text-slate-500")}>
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                            Cargando clientes...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={cn("px-6 py-12 text-center", dm ? "text-slate-500" : "text-slate-500")}>
                            No hay clientes registrados. Crea el primero.
                          </td>
                        </tr>
                      ) : users.filter(u => u.role !== 'superadmin' && u.role !== 'subadmin').map((u) => (
                        <tr key={u.id} className={cn("transition-colors", dm ? "hover:bg-slate-800/40" : T.hover50)}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0", T.iconBg, T.iconCol)}>
                                {(u.name || u.email).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className={cn("font-medium", dm ? "text-white" : "text-slate-900")}>{u.name || '—'}</p>
                                <p className={cn("text-xs", dm ? "text-slate-400" : "text-slate-500")}>{u.email}</p>
                                <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-500")}>{u.company || 'Sin empresa'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setPlanDropdown(planDropdown === u.id ? null : u.id)}
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors",
                                  PLAN_COLORS_DARK[u.plan] || PLAN_COLORS_DARK['Básico']
                                )}
                              >
                                {u.plan}
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              {planDropdown === u.id && (
                                <div className={cn("absolute top-full left-0 mt-1 border rounded-lg shadow-xl z-30 w-36 overflow-hidden", dm ? "bg-slate-800 border-slate-700" : T.bg50, T.border)}>
                                  {PLANS.map(p => (
                                    <button
                                      key={p}
                                      onClick={() => handlePlanChange(u, p)}
                                      className={cn(
                                        "w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between",
                                        u.plan === p
                                          ? cn(T.iconBg, T.iconCol)
                                          : dm ? "text-slate-200 hover:bg-slate-700" : cn("text-slate-700", T.hover50)
                                      )}
                                    >
                                      {p} {u.plan === p && <Check className="w-3 h-3" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="space-y-0.5">
                              <p className={cn("text-xs", dm ? "text-slate-300" : "text-slate-700")}>{u.leads_count} leads</p>
                              <p className={cn("text-xs", dm ? "text-slate-400" : "text-slate-500")}>{u.automations_count} flows</p>
                              <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-500")}>{u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : '—'}</p>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                                u.is_active
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20"
                                  : dm
                                    ? "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                                    : cn(T.bg50, T.border, "text-slate-600 hover:bg-slate-100")
                              )}
                            >
                              {u.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                              {u.is_active ? 'Activo' : 'Inactivo'}
                            </button>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex gap-1 flex-wrap">
                              {FEATURE_LABELS.map(f => (
                                <span
                                  key={f.key}
                                  title={f.label}
                                  className={cn(
                                    "w-6 h-6 rounded flex items-center justify-center",
                                    u[f.key]
                                      ? cn(T.iconBg, T.iconCol)
                                      : dm ? "bg-slate-800 text-slate-600" : "bg-zinc-100 text-slate-400"
                                  )}
                                >
                                  <f.icon className="w-3.5 h-3.5" />
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openFeatures(u)}
                                title="Editar permisos"
                                className={cn("p-1.5 rounded-lg transition-colors", dm ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:bg-white/10")}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {user?.role === 'superadmin' && (
                                <button
                                  onClick={() => handleDelete(u.id)}
                                  title="Eliminar cliente"
                                  className={cn("p-1.5 rounded-lg transition-colors", dm ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" : "text-slate-500 hover:text-rose-600 hover:bg-rose-50")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* AI Configuration */}
            {activeSection === 'ai_config' && (
              <div className={cn(card, "overflow-hidden")}>
                <div className={cn("p-6 border-b flex items-center gap-3", dm ? "border-slate-800" : T.border)}>
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", T.iconBg, T.iconCol)}>
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={cn("font-semibold text-lg", dm ? "text-white" : "text-slate-900")}>Configuración de IA</h2>
                    <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>Clave de OpenAI compartida por todos los clientes de la plataforma.</p>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Status */}
                  <div className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border text-sm",
                    aiConfig.hasKey
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                  )}>
                    {aiConfig.hasKey
                      ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
                      : <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />}
                    <div>
                      {aiConfig.hasKey ? (
                        <>
                          <p className="font-medium">IA activa para todos los clientes</p>
                          <p className="mt-0.5 opacity-80">Clave configurada: <span className="font-mono">{aiConfig.keyPreview}</span> · Modelo: gpt-4o-mini</p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium">Sin clave de API — IA desactivada</p>
                          <p className="mt-0.5 opacity-80">Ningún cliente puede usar funciones de IA hasta que configures la clave.</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Input row */}
                  <div>
                    <label className={cn("block text-xs font-medium mb-2", dm ? "text-slate-400" : "text-slate-500")}>
                      {aiConfig.hasKey ? 'Actualizar clave de OpenAI' : 'Agregar clave de OpenAI (sk-proj-...)'}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showAiKey ? 'text' : 'password'}
                          value={aiKeyInput}
                          onChange={e => setAiKeyInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveAiKey()}
                          placeholder="sk-proj-..."
                          className={cn(inputCls, "pr-10 font-mono")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAiKey(!showAiKey)}
                          className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", dm ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}
                        >
                          {showAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        onClick={handleSaveAiKey}
                        disabled={!aiKeyInput.trim() || aiSaving}
                        className={cn("px-4 py-2.5 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2", T.btn)}
                      >
                        {aiSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar
                      </button>
                    </div>
                    <p className={cn("text-xs mt-2", dm ? "text-slate-500" : "text-slate-500")}>
                      Obtén tu clave en <span className={cn("font-mono", T.iconColMd)}>platform.openai.com/api-keys</span> · La clave se almacena en la BD del servidor, nunca en el frontend.
                    </p>
                  </div>

                  {/* Remove key */}
                  {aiConfig.hasKey && (
                    <div className={cn("pt-1 border-t", dm ? "border-slate-800" : T.border)}>
                      <button
                        onClick={handleRemoveAiKey}
                        disabled={aiSaving}
                        className="text-sm text-rose-500 hover:text-rose-600 transition-colors disabled:opacity-40"
                      >
                        Eliminar clave configurada
                      </button>
                    </div>
                  )}

                  {/* How it works */}
                  <div className={cn("rounded-xl p-4 text-xs space-y-1.5 border", dm ? "bg-slate-800/60 border-slate-700/50 text-slate-400" : T.tableHead)}>
                    <p className={cn("font-semibold flex items-center gap-2", dm ? "text-slate-300" : "text-slate-700")}>
                      <KeyRound className={cn("w-3.5 h-3.5", T.iconColMd)} /> Cómo funciona
                    </p>
                    <p>• <strong className={dm ? "text-slate-300" : "text-slate-700"}>Tú</strong> (superadmin) pones aquí la clave de OpenAI una sola vez.</p>
                    <p>• <strong className={dm ? "text-slate-300" : "text-slate-700"}>Todos los clientes</strong> usan la IA sin saber que existe OpenAI — solo ven Sellia.</p>
                    <p>• El costo de IA va a tu cuenta de OpenAI. Inclúyelo en el precio de los planes.</p>
                    <p>• Estimado: ~$0.003 por conversación completa con gpt-4o-mini.</p>
                  </div>
                </div>
              </div>
            )}

            {/* WhatsApp Webhook Info */}
            {activeSection === 'whatsapp' && (
              <div className={cn(card, "p-6")}>
                <h2 className={cn("font-semibold text-lg mb-1 flex items-center gap-2", dm ? "text-white" : "text-slate-900")}>
                  💬 Webhook de WhatsApp Business API
                </h2>
                <p className={cn("text-sm mb-4", dm ? "text-slate-400" : "text-slate-500")}>
                  Cada cliente configura su propio número en Integraciones → WhatsApp. Esta es la URL del webhook que deben registrar en Meta.
                </p>
                <div className={cn("rounded-xl p-4 border space-y-3", dm ? "bg-slate-800/60 border-slate-700/50" : cn(T.bg50s, T.border))}>
                  <div>
                    <p className={cn("text-xs mb-1 font-medium uppercase tracking-wider", dm ? "text-slate-500" : "text-slate-500")}>URL del Webhook</p>
                    <code className={cn("text-sm font-mono break-all", T.iconColMd)}>
                      {window.location.origin}/api/webhooks/whatsapp
                    </code>
                  </div>
                  <div className={cn("text-xs space-y-1", dm ? "text-slate-400" : "text-slate-500")}>
                    <p>• En <strong className={dm ? "text-slate-300" : "text-slate-700"}>Meta Developers Console</strong> → WhatsApp → Configuration → Webhook</p>
                    <p>• Callback URL: la URL de arriba</p>
                    <p>• Verify Token: cada cliente ve el suyo en Integraciones → WhatsApp → Configurar</p>
                    <p>• Suscribir al campo: <code className="text-emerald-500">messages</code></p>
                  </div>
                </div>
              </div>
            )}

            {/* ── KB & Simulator (combined) ────────────────────────────────── */}
            {(activeSection === 'kb_simulator' || activeSection === 'knowledge' || activeSection === 'simulator') && (
              <div className="space-y-4">
                {/* Shared header + client selector */}
                <div className={cn(card, "p-5")}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                        <BookMarked className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className={cn("font-semibold text-lg", dm ? "text-white" : "text-slate-900")}>KB & Simulador</h2>
                        <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>Edita la base de conocimientos y prueba la IA en tiempo real.</p>
                      </div>
                    </div>
                    <div className="sm:w-72">
                      <select
                        value={kbUserId ?? ''}
                        onChange={async e => {
                          const id = Number(e.target.value);
                          if (!id) { setKbUserId(null); setKbContent(''); setKbAgentName('Agente IA'); setKbCollectionPrompt(''); setTrainUserId(null); setTrainMessages([]); return; }
                          setKbUserId(id);
                          setTrainUserId(id);
                          setTrainMessages([]);
                          setKbLoading(true);
                          try {
                            const [data, cpData] = await Promise.all([
                              api.adminGetUserKnowledge(id),
                              api.adminGetUserCollectionPrompt(id),
                            ]);
                            setKbContent(data.content);
                            setKbAgentName(data.agentName || 'Agente IA');
                            setKbCollectionPrompt(cpData.collection_prompt || '');
                          } catch { setKbContent(''); setKbAgentName('Agente IA'); setKbCollectionPrompt(''); }
                          finally { setKbLoading(false); }
                        }}
                        className={inputCls}
                      >
                        <option value="">— Seleccionar cliente —</option>
                        {users.filter(u => u.role !== 'superadmin' && u.role !== 'subadmin').map(u => <option key={u.id} value={u.id}>{u.name || u.email} ({u.company || 'Sin empresa'})</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Two columns: KB left, Simulator right */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* ── Left: Knowledge Base ── */}
                  <div className={cn(card, "overflow-hidden flex flex-col")}>
                    <div className={cn("px-5 py-3 border-b flex items-center justify-between gap-2", dm ? "border-slate-800" : T.border)}>
                      <div className="flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-emerald-400" />
                        <span className={cn("font-semibold text-sm", dm ? "text-white" : "text-slate-900")}>Base de Conocimientos</span>
                      </div>
                      {kbUserId && (
                        <div className={cn("flex rounded-lg border overflow-hidden text-xs", dm ? "border-slate-700" : T.border)}>
                          <button
                            onClick={() => setKbCollectionTab('ventas')}
                            className={cn("px-3 py-1 font-medium transition-colors", kbCollectionTab === 'ventas' ? cn(T.activeNav) : dm ? "text-slate-400 hover:text-white" : cn("text-slate-600", T.hover50))}
                          >Ventas</button>
                          <button
                            onClick={() => setKbCollectionTab('cobranza')}
                            className={cn("px-3 py-1 font-medium transition-colors", kbCollectionTab === 'cobranza' ? cn(T.activeNav) : dm ? "text-slate-400 hover:text-white" : cn("text-slate-600", T.hover50))}
                          >Cobranza Sellia</button>
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 space-y-3">
                      {!kbUserId ? (
                        <p className={cn("text-sm text-center py-8", dm ? "text-slate-500" : "text-slate-400")}>Selecciona un cliente arriba para editar su KB.</p>
                      ) : kbLoading ? (
                        <div className="flex items-center gap-2 text-sm text-slate-400 py-4"><RefreshCw className="w-4 h-4 animate-spin" /> Cargando...</div>
                      ) : kbCollectionTab === 'ventas' ? (
                        <>
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Nombre del Agente IA</label>
                            <input
                              type="text"
                              value={kbAgentName}
                              onChange={e => setKbAgentName(e.target.value)}
                              placeholder="Ej: Barbería San Bernardo..."
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Contenido</label>
                            <textarea
                              value={kbContent}
                              onChange={e => setKbContent(e.target.value)}
                              rows={14}
                              placeholder={`Nombre del negocio: Empresa XYZ\nQué vendemos: ...\n\nPRECIOS:\n- Plan Básico: $299/mes\n\nPREGUNTAS FRECUENTES:\n...`}
                              className={cn(inputCls, "resize-none font-mono text-xs")}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={cn("text-xs", dm ? "text-slate-500" : "text-slate-400")}>{kbContent.length} caracteres</span>
                            <button
                              onClick={async () => {
                                setKbSaving(true);
                                try {
                                  await api.adminUpdateUserKnowledge(kbUserId!, kbContent, kbAgentName);
                                  setKbToast({ msg: 'KB guardada correctamente.', ok: true });
                                } catch (err: any) {
                                  setKbToast({ msg: err.message, ok: false });
                                } finally {
                                  setKbSaving(false);
                                  setTimeout(() => setKbToast(null), 3500);
                                }
                              }}
                              disabled={kbSaving}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {kbSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Guardar KB
                            </button>
                          </div>
                          {kbToast && (
                            <div className={cn("px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 border", kbToast.ok
                              ? dm ? "bg-emerald-900 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : dm ? "bg-rose-900 border-rose-700 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-700"
                            )}>
                              {kbToast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                              {kbToast.msg}
                            </div>
                          )}
                        </>
                      ) : (
                        /* ── Cobranza IA tab ── */
                        <>
                          <div className={cn("rounded-lg border p-3 text-xs", dm ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-amber-50 border-amber-200 text-amber-800")}>
                            Describe el negocio del cliente, su tono y cualquier contexto relevante para que Sellia genere mensajes de cobranza auténticos. Si está vacío, se usarán los mensajes predeterminados.
                          </div>
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Prompt de Cobranza Sellia</label>
                            <textarea
                              value={kbCollectionPrompt}
                              onChange={e => setKbCollectionPrompt(e.target.value)}
                              rows={14}
                              placeholder={`Somos [nombre del estudio/empresa], especializados en [servicio].\n\nNuestros clientes son [descripción]. El tono debe ser [profesional/cercano/firme].\n\nNunca [restricción]. Siempre [instrucción].`}
                              className={cn(inputCls, "resize-none font-mono text-xs")}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={cn("text-xs", dm ? "text-slate-500" : "text-slate-400")}>{kbCollectionPrompt.length} caracteres</span>
                            <button
                              onClick={async () => {
                                setKbCollectionSaving(true);
                                try {
                                  await api.adminUpdateUserCollectionPrompt(kbUserId!, kbCollectionPrompt);
                                  setKbToast({ msg: 'Prompt de cobranza guardado.', ok: true });
                                } catch (err: any) {
                                  setKbToast({ msg: err.message, ok: false });
                                } finally {
                                  setKbCollectionSaving(false);
                                  setTimeout(() => setKbToast(null), 3500);
                                }
                              }}
                              disabled={kbCollectionSaving}
                              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              {kbCollectionSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Guardar Prompt
                            </button>
                          </div>
                          {kbToast && (
                            <div className={cn("px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 border", kbToast.ok
                              ? dm ? "bg-emerald-900 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : dm ? "bg-rose-900 border-rose-700 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-700"
                            )}>
                              {kbToast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                              {kbToast.msg}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Right: Simulator ── */}
                  <div className={cn(card, "overflow-hidden flex flex-col")}>
                    <div className={cn("px-5 py-3 border-b flex items-center justify-between", dm ? "border-slate-800" : T.border)}>
                      <div className="flex items-center gap-2">
                        <Bot className={cn("w-4 h-4", T.iconColMd)} />
                        <span className={cn("font-semibold text-sm", dm ? "text-white" : "text-slate-900")}>Simulador</span>
                      </div>
                      {trainMessages.length > 0 && (
                        <button onClick={() => { setTrainMessages([]); setTrainStatus(null); }} className={cn("text-xs px-2 py-1 rounded-lg transition-colors", dm ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100")}>
                          Limpiar
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col flex-1" style={{ minHeight: 420 }}>
                      {!kbUserId ? (
                        <div className={cn("flex-1 flex flex-col items-center justify-center text-sm p-8 text-center", dm ? "text-slate-500" : "text-slate-400")}>
                          <Bot className="w-10 h-10 mx-auto mb-3 opacity-20" />
                          Selecciona un cliente arriba para simular la IA.
                        </div>
                      ) : (
                        <>
                          <div className={cn("flex-1 p-4 space-y-3 overflow-y-auto", dm ? "bg-slate-800/30" : "bg-slate-50/50")} style={{ maxHeight: 380 }}>
                            {trainMessages.length === 0 && (
                              <div className={cn("text-center text-sm py-8", dm ? "text-slate-500" : "text-slate-400")}>
                                <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                Escribe como el prospecto en WhatsApp...
                              </div>
                            )}
                            {trainMessages.map((msg, idx) => (
                              <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                                {msg.role === 'assistant' && (
                                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center mr-2 shrink-0 mt-1", T.iconBg2, T.iconCol)}>
                                    <Bot className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <div className={cn(
                                  "max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                                  msg.role === 'user'
                                    ? T.msgBubble
                                    : dm ? "bg-slate-700 text-slate-100 rounded-tl-sm" : "bg-white text-slate-800 shadow-sm rounded-tl-sm"
                                )}>
                                  {msg.content}
                                </div>
                              </div>
                            ))}
                            {trainLoading && (
                              <div className="flex justify-start">
                                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center mr-2 shrink-0", T.iconBg2, T.iconCol)}>
                                  <Bot className="w-3.5 h-3.5" />
                                </div>
                                <div className={cn("px-3.5 py-2.5 rounded-2xl rounded-tl-sm", dm ? "bg-slate-700" : "bg-white shadow-sm")}>
                                  <div className="flex gap-1 items-center py-1">
                                    <div className={cn("w-2 h-2 rounded-full animate-bounce", T.iconBg2)} style={{ animationDelay: '0ms' }} />
                                    <div className={cn("w-2 h-2 rounded-full animate-bounce", T.iconBg2)} style={{ animationDelay: '150ms' }} />
                                    <div className={cn("w-2 h-2 rounded-full animate-bounce", T.iconBg2)} style={{ animationDelay: '300ms' }} />
                                  </div>
                                </div>
                              </div>
                            )}
                            {trainStatus && (
                              <div className="flex justify-center">
                                <span className={cn("text-xs px-2 py-1 rounded-full border", dm ? "border-slate-600 text-slate-400" : cn(T.border, "text-slate-500"))}>
                                  Estado: <strong className={T.iconColMd}>{trainStatus}</strong>
                                </span>
                              </div>
                            )}
                            <div ref={trainEndRef} />
                          </div>
                          <div className={cn("p-3 border-t flex gap-2", dm ? "border-slate-700 bg-slate-900" : cn(T.border, "bg-white"))}>
                            <input
                              type="text"
                              value={trainInput}
                              onChange={e => setTrainInput(e.target.value)}
                              onKeyDown={async e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (!trainInput.trim() || trainLoading || !trainUserId) return;
                                  const userMsg = trainInput.trim();
                                  setTrainInput('');
                                  const newMessages = [...trainMessages, { role: 'user' as const, content: userMsg }];
                                  setTrainMessages(newMessages);
                                  setTrainLoading(true);
                                  try {
                                    const res = await api.adminAiTestChat({ userId: trainUserId, messages: newMessages });
                                    setTrainMessages([...newMessages, { role: 'assistant', content: res.content }]);
                                    if (res.newStatus) setTrainStatus(res.newStatus);
                                    if (res.saleDetected) setTrainStatus('Cerrado Ganado 🎉');
                                    setTimeout(() => trainEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                                  } catch (err: any) {
                                    setTrainMessages([...newMessages, { role: 'assistant', content: '❌ Error: ' + err.message }]);
                                  } finally { setTrainLoading(false); }
                                }
                              }}
                              placeholder="Escribe como el prospecto... (Enter para enviar)"
                              disabled={trainLoading}
                              className={cn(inputCls, "flex-1")}
                            />
                            <button
                              disabled={!trainInput.trim() || trainLoading}
                              onClick={async () => {
                                if (!trainInput.trim() || trainLoading || !trainUserId) return;
                                const userMsg = trainInput.trim();
                                setTrainInput('');
                                const newMessages = [...trainMessages, { role: 'user' as const, content: userMsg }];
                                setTrainMessages(newMessages);
                                setTrainLoading(true);
                                try {
                                  const res = await api.adminAiTestChat({ userId: trainUserId, messages: newMessages });
                                  setTrainMessages([...newMessages, { role: 'assistant', content: res.content }]);
                                  if (res.newStatus) setTrainStatus(res.newStatus);
                                  if (res.saleDetected) setTrainStatus('Cerrado Ganado 🎉');
                                  setTimeout(() => trainEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                                } catch (err: any) {
                                  setTrainMessages([...newMessages, { role: 'assistant', content: '❌ Error: ' + err.message }]);
                                } finally { setTrainLoading(false); }
                              }}
                              className={cn("px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed", T.btn)}
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Growth Analyzer ────────────────────────────────────────────── */}
            {activeSection === 'growth' && (
              <div className={cn(card, "overflow-hidden")}>
                <div className={cn("p-6 border-b flex items-center gap-3", dm ? "border-slate-800" : T.border)}>
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className={cn("font-semibold text-lg", dm ? "text-white" : "text-slate-900")}>Sellia Analyzer  </h2>
                    <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>
                      Analiza las conversaciones de un cliente con IA y genera propuestas concretas para mejorar las conversiones.
                    </p>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className={cn("block text-xs font-medium mb-2", dm ? "text-slate-400" : "text-slate-500")}>Analizar cliente</label>
                      <select
                        value={growthUserId ?? ''}
                        onChange={e => { setGrowthUserId(Number(e.target.value) || null); setGrowthResult(null); }}
                        className={inputCls}
                      >
                        <option value="">— Seleccionar cliente —</option>
                        {users.filter(u => u.role !== 'superadmin' && u.role !== 'subadmin').map(u => <option key={u.id} value={u.id}>{u.name || u.email} ({u.company || 'Sin empresa'}) — {u.leads_count} leads</option>)}
                      </select>
                    </div>
                    <button
                      disabled={!growthUserId || growthLoading}
                      onClick={async () => {
                        if (!growthUserId) return;
                        setGrowthLoading(true);
                        setGrowthResult(null);
                        try {
                          const result = await api.adminGrowthAnalyze(growthUserId);
                          setGrowthResult(result);
                        } catch (err: any) {
                          showAiMsg(err.message, false);
                        } finally {
                          setGrowthLoading(false);
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                    >
                      {growthLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Analizar
                    </button>
                  </div>

                  {growthLoading && (
                    <div className={cn("rounded-xl border p-6 text-center", dm ? "border-slate-700 bg-slate-800/40" : cn(T.border, T.bg50s))}>
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
                      <p className={cn("text-sm", dm ? "text-slate-400" : "text-slate-500")}>Analizando conversaciones con IA...</p>
                    </div>
                  )}

                  {growthResult && (
                    <div className="space-y-4">
                      {/* Score + Summary */}
                      <div className={cn("rounded-xl border p-5", dm ? "border-slate-700 bg-slate-800/40" : cn(T.border, T.bg50s))}>
                        <div className="flex items-center gap-4 mb-3">
                          <div className="text-center">
                            <div className={cn("text-3xl font-bold", growthResult.conversionScore >= 70 ? "text-emerald-500" : growthResult.conversionScore >= 40 ? "text-amber-500" : "text-rose-500")}>
                              {growthResult.conversionScore}
                            </div>
                            <div className={cn("text-xs", dm ? "text-slate-400" : "text-slate-500")}>/ 100</div>
                          </div>
                          <div>
                            <p className={cn("text-xs font-semibold uppercase tracking-wider mb-1", dm ? "text-slate-400" : "text-slate-500")}>Puntuación del Agente IA</p>
                            <p className={cn("text-sm", dm ? "text-slate-200" : "text-slate-700")}>{growthResult.summary}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strengths */}
                        <div className={cn("rounded-xl border p-4", dm ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50")}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3 flex items-center gap-2">
                            <Star className="w-3.5 h-3.5" /> Fortalezas
                          </p>
                          <ul className="space-y-1.5">
                            {growthResult.strengths.map((s, i) => (
                              <li key={i} className={cn("text-sm flex items-start gap-2", dm ? "text-slate-300" : "text-slate-700")}>
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" /> {s}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Weaknesses */}
                        <div className={cn("rounded-xl border p-4", dm ? "border-rose-500/20 bg-rose-500/5" : "border-rose-200 bg-rose-50")}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-3 flex items-center gap-2">
                            <TrendingDown className="w-3.5 h-3.5" /> Áreas de Mejora
                          </p>
                          <ul className="space-y-1.5">
                            {growthResult.weaknesses.map((w, i) => (
                              <li key={i} className={cn("text-sm flex items-start gap-2", dm ? "text-slate-300" : "text-slate-700")}>
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" /> {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Suggestions */}
                      <div className={cn("rounded-xl border p-4", dm ? T.darkSugBox : cn(T.border, T.bg50))}>
                        <p className={cn("text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2", T.iconColMd)}>
                          <Lightbulb className="w-3.5 h-3.5" /> Recomendaciones para Mejorar Conversiones
                        </p>
                        <ol className="space-y-2">
                          {growthResult.suggestions.map((s, i) => (
                            <li key={i} className={cn("text-sm flex items-start gap-2", dm ? "text-slate-300" : "text-slate-700")}>
                              <span className={cn("w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0", T.darkSugNum)}>{i + 1}</span>
                              {s}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* KB Suggestions */}
                      {growthResult.kbSuggestions.length > 0 && (
                        <div className={cn("rounded-xl border p-4", dm ? "border-amber-500/20 bg-amber-500/5" : "border-amber-200 bg-amber-50")}>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5" /> Añadir a la Base de Conocimientos
                            </p>
                            {growthUserId && (
                              <button
                                onClick={async () => {
                                  if (!growthUserId) return;
                                  setKbUserId(growthUserId);
                                  setKbLoading(true);
                                  try {
                                    const data = await api.adminGetUserKnowledge(growthUserId);
                                    const additions = growthResult.kbSuggestions.join('\n\n');
                                    setKbContent((data.content ? data.content + '\n\n' : '') + '--- SUGERENCIAS DE GROWTH ANALYZER ---\n' + additions);
                                    setKbToast({ msg: 'Sugerencias añadidas al editor de KB. Guarda los cambios cuando estés listo.', ok: true });
                                    setTimeout(() => setKbToast(null), 5000);
                                  } catch { }
                                  finally { setKbLoading(false); }
                                }}
                                className="text-xs px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-white rounded-lg font-medium transition-colors"
                              >
                                Añadir a KB
                              </button>
                            )}
                          </div>
                          <ul className="space-y-2">
                            {growthResult.kbSuggestions.map((s, i) => (
                              <li key={i} className={cn("text-sm p-2.5 rounded-lg border text-left", dm ? "border-amber-500/15 bg-amber-500/5 text-slate-300" : "border-amber-200 bg-white text-slate-700")}>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {!growthUserId && !growthResult && (
                    <div className={cn("rounded-xl border p-4 text-xs space-y-1.5", dm ? "border-slate-700/50 bg-slate-800/40 text-slate-400" : cn(T.border, T.bg50s, "text-slate-500"))}>
                      <p className={cn("font-semibold flex items-center gap-2 mb-2", dm ? "text-slate-300" : "text-slate-700")}>
                        <Activity className="w-3.5 h-3.5 text-amber-500" /> Cómo funciona el Sellia Analyzer
                      </p>
                      <p>• Selecciona un cliente que tenga conversaciones registradas.</p>
                      <p>• La IA analiza sus últimas 100 interacciones en WhatsApp.</p>
                      <p>• Recibirás: puntuación del agente, fortalezas, debilidades, recomendaciones y sugerencias para la KB.</p>
                      <p>• Puedes añadir las sugerencias directamente a la base de conocimientos del cliente con un clic.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Sellia Chats — Prospectos de Sellia ─────────────────────────── */}
            {activeSection === 'chats' && (
              <div className={cn(card, "overflow-hidden")}>
                <div className={cn("p-6 border-b flex items-center justify-between", dm ? "border-slate-800" : T.border)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className={cn("font-semibold text-lg", dm ? "text-white" : "text-slate-900")}>Chats de Sellia</h2>
                      <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>
                        Prospectos para Sellia — la IA cierra ventas usando la base de conocimientos de Sellia.
                      </p>
                    </div>
                  </div>
                  {/* Tabs */}
                  <div className={cn("flex rounded-lg border overflow-hidden text-sm", dm ? "border-slate-700" : T.border)}>
                    <button
                      onClick={() => setSelliaSection('leads')}
                      className={cn("px-4 py-1.5 font-medium transition-colors flex items-center gap-1.5",
                        selliaSection === 'leads' ? cn(T.activeNav) : dm ? "text-slate-400 hover:text-white" : cn("text-slate-600", T.hover50)
                      )}
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Leads
                    </button>
                    <button
                      onClick={() => setSelliaSection('kb')}
                      className={cn("px-4 py-1.5 font-medium transition-colors flex items-center gap-1.5",
                        selliaSection === 'kb' ? cn(T.activeNav) : dm ? "text-slate-400 hover:text-white" : cn("text-slate-600", T.hover50)
                      )}
                    >
                      <BookMarked className="w-3.5 h-3.5" /> KB Sellia
                    </button>
                    <button
                      onClick={() => setSelliaSection('collection_prompt')}
                      className={cn("px-4 py-1.5 font-medium transition-colors flex items-center gap-1.5",
                        selliaSection === 'collection_prompt' ? cn(T.activeNav) : dm ? "text-slate-400 hover:text-white" : cn("text-slate-600", T.hover50)
                      )}
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Cobranza IA
                    </button>
                  </div>
                </div>

                {selliaSection === 'collection_prompt' ? (
                  /* ── Cobranza IA Editor for Sellia ── */
                  <div className="p-6 space-y-4">
                    <div className={cn("rounded-lg border p-3 text-xs", dm ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-amber-50 border-amber-200 text-amber-800")}>
                      Configura el prompt que la IA de Sellia usa para cobrar a sus propios clientes (dueños de negocio que usan la plataforma). Describe el tono y contexto de Sellia como empresa de SaaS.
                    </div>
                    <div>
                      <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>
                        Prompt de Cobranza IA — Sellia
                      </label>
                      <textarea
                        value={selliaCollectionPrompt}
                        onChange={e => setSelliaCollectionPrompt(e.target.value)}
                        rows={12}
                        placeholder={`Somos Sellia, una plataforma SaaS de CRM e IA para WhatsApp.\n\nNuestros clientes son dueños de negocio que pagan por el servicio mensualmente.\n\nEl tono debe ser profesional y amigable, recordando que somos sus socios tecnológicos.\n\nNunca amenazamos con acciones legales. Siempre ofrecemos coordinar una solución.`}
                        className={cn(inputCls, "resize-none font-mono text-xs")}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-500")}>{selliaCollectionPrompt.length} caracteres</p>
                      <button
                        onClick={async () => {
                          setSelliaCollectionSaving(true);
                          try {
                            await api.adminUpdateSelliaCollectionPrompt(selliaCollectionPrompt);
                            setSelliaCollectionToast({ msg: 'Prompt de cobranza de Sellia guardado.', ok: true });
                          } catch (err: any) {
                            setSelliaCollectionToast({ msg: err.message, ok: false });
                          } finally {
                            setSelliaCollectionSaving(false);
                            setTimeout(() => setSelliaCollectionToast(null), 3500);
                          }
                        }}
                        disabled={selliaCollectionSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {selliaCollectionSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar Prompt
                      </button>
                    </div>
                    {selliaCollectionToast && (
                      <div className={cn("px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 border",
                        selliaCollectionToast.ok
                          ? dm ? "bg-emerald-900 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : dm ? "bg-rose-900 border-rose-700 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-700"
                      )}>
                        {selliaCollectionToast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {selliaCollectionToast.msg}
                      </div>
                    )}
                  </div>
                ) : selliaSection === 'kb' ? (
                  /* ── KB Editor ── */
                  <div className="p-6 space-y-4">
                    <div>
                      <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Nombre del Agente</label>
                      <input
                        value={selliaAgentName}
                        onChange={e => setSelliaAgentName(e.target.value)}
                        placeholder="Sellia"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>
                        Base de Conocimientos de Sellia (pitch para vender la plataforma a dueños de negocio)
                      </label>
                      <textarea
                        value={selliaKb}
                        onChange={e => setSelliaKb(e.target.value)}
                        rows={12}
                        placeholder={`Qué es Sellia: Plataforma de CRM + IA para WhatsApp que automatiza ventas.\n\nPlanes:\n- Básico: $49/mes — Chats IA + CRM\n- Pro: $99/mes — Todo + Automatizaciones\n- Enterprise: $199/mes — Todo ilimitado\n\nBeneficios clave:\n- El agente IA responde 24/7 por WhatsApp\n- Agenda citas automáticamente\n- Cierra ventas sin intervención humana\n...`}
                        className={cn(inputCls, "resize-none font-mono text-xs")}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-500")}>{selliaKb.length} caracteres</p>
                      <button
                        onClick={async () => {
                          setSelliaKbSaving(true);
                          try {
                            await api.adminUpdateSelliaKb(selliaKb, selliaAgentName);
                            setSelliaKbToast({ msg: 'Base de conocimientos de Sellia guardada.', ok: true });
                          } catch (err: any) {
                            setSelliaKbToast({ msg: err.message, ok: false });
                          } finally {
                            setSelliaKbSaving(false);
                            setTimeout(() => setSelliaKbToast(null), 3500);
                          }
                        }}
                        disabled={selliaKbSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {selliaKbSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Guardar KB
                      </button>
                    </div>
                    {selliaKbToast && (
                      <div className={cn("px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 border",
                        selliaKbToast.ok
                          ? dm ? "bg-emerald-900 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : dm ? "bg-rose-900 border-rose-700 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-700"
                      )}>
                        {selliaKbToast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        {selliaKbToast.msg}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Leads + Chat ── */
                  (() => {
                    // Chile timezone helpers
                    const fmtTime = (d: string) => d ? new Date(d).toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit' }) : '';
                    const fmtDateLabel = (d: string) => {
                      if (!d) return '';
                      const msgDate = new Date(new Date(d).toLocaleString('en-US', { timeZone: 'America/Santiago' }));
                      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
                      const yest = new Date(now); yest.setDate(yest.getDate() - 1);
                      if (msgDate.toDateString() === now.toDateString()) return 'Hoy';
                      if (msgDate.toDateString() === yest.toDateString()) return 'Ayer';
                      return new Date(d).toLocaleDateString('es-CL', { timeZone: 'America/Santiago', weekday: 'long', day: 'numeric', month: 'long' });
                    };
                    const getDateKey = (d: string) => d ? new Date(d).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' }) : '';

                    const filteredLeads = selliaLeads.filter(l =>
                      !selliaLeadSearch || l.name?.toLowerCase().includes(selliaLeadSearch.toLowerCase()) || l.company?.toLowerCase().includes(selliaLeadSearch.toLowerCase())
                    );

                    // Build messages with date separators
                    const messagesWithSeparators: { type: 'separator'; label: string } | { type: 'msg'; msg: any; idx: number }[] = [];
                    let lastDateKey = '';
                    selliaMessages.forEach((msg, idx) => {
                      const dk = getDateKey(msg.created_at);
                      if (dk && dk !== lastDateKey) {
                        (messagesWithSeparators as any[]).push({ type: 'separator', label: fmtDateLabel(msg.created_at) });
                        lastDateKey = dk;
                      }
                      (messagesWithSeparators as any[]).push({ type: 'msg', msg, idx });
                    });

                    return (
                      <div className="flex h-[560px]">
                        {/* ── Left: contact list ── */}
                        <div className={cn("w-72 shrink-0 border-r flex flex-col", dm ? "border-slate-800" : T.border)}>
                          {/* Search + new */}
                          <div className={cn("p-3 border-b space-y-2", dm ? "border-slate-800" : T.border)}>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 relative">
                                <input
                                  value={selliaLeadSearch}
                                  onChange={e => setSelliaLeadSearch(e.target.value)}
                                  placeholder="Buscar..."
                                  className={cn("w-full pl-3 pr-3 py-1.5 rounded-lg text-xs border outline-none transition-colors",
                                    dm ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-slate-100 border-transparent focus:bg-white focus:border-slate-300 text-slate-800 placeholder:text-slate-400"
                                  )}
                                />
                              </div>
                              <button
                                onClick={() => setShowNewSelliaLead(v => !v)}
                                className="w-7 h-7 flex items-center justify-center bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shrink-0"
                                title="Nueva conversación"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <p className={cn("text-[10px] font-medium", dm ? "text-slate-500" : "text-slate-400")}>
                              {filteredLeads.length} conversación{filteredLeads.length !== 1 ? 'es' : ''}
                            </p>
                          </div>

                          {/* New lead form */}
                          {showNewSelliaLead && (
                            <div className={cn("p-3 border-b space-y-2", dm ? "border-slate-700 bg-slate-800/60" : cn(T.border, T.bg50s))}>
                              <input autoFocus value={newSelliaLeadName} onChange={e => setNewSelliaLeadName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && createSelliaLead()}
                                placeholder="Nombre del prospecto" className={cn(inputCls, "text-xs py-1.5")} />
                              <input value={newSelliaLeadCompany} onChange={e => setNewSelliaLeadCompany(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && createSelliaLead()}
                                placeholder="Empresa (opcional)" className={cn(inputCls, "text-xs py-1.5")} />
                              <div className="flex gap-2">
                                <button onClick={createSelliaLead} className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition-colors">Crear</button>
                                <button onClick={() => { setShowNewSelliaLead(false); setNewSelliaLeadName(''); setNewSelliaLeadCompany(''); }}
                                  className={cn("flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors", dm ? "border-slate-700 text-slate-400 hover:bg-slate-700" : cn(T.border, "text-slate-500", T.hover100))}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Lead list */}
                          <div className="flex-1 overflow-y-auto">
                            {filteredLeads.length === 0 ? (
                              <div className={cn("p-6 text-center text-xs", dm ? "text-slate-500" : "text-slate-500")}>
                                {selliaLeadSearch ? 'Sin resultados' : <>No hay conversaciones.<br />Pulsa + para crear una.</>}
                              </div>
                            ) : filteredLeads.map(lead => {
                              const lastMsg = lead.messages?.[lead.messages.length - 1];
                              const isActive = selliaLead?.id === lead.id;
                              return (
                                <div
                                  key={lead.id}
                                  className={cn(
                                    "group relative border-b flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors",
                                    dm ? "border-slate-800/70" : "border-slate-100",
                                    isActive
                                      ? dm ? "bg-purple-500/15" : "bg-purple-50"
                                      : dm ? "hover:bg-slate-800/50" : "hover:bg-slate-50"
                                  )}
                                  onClick={() => selectSelliaLead(lead)}
                                >
                                  {/* Avatar */}
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                                    isActive ? "bg-purple-600 text-white" : dm ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
                                  )}>
                                    {(lead.name || '?').charAt(0).toUpperCase()}
                                  </div>
                                  {/* Info */}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <p className={cn("text-sm font-semibold truncate", dm ? "text-white" : "text-slate-900")}>{lead.name}</p>
                                      {lastMsg?.created_at && (
                                        <span className={cn("text-[10px] shrink-0", dm ? "text-slate-500" : "text-slate-400")}>
                                          {fmtTime(lastMsg.created_at)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                                        lead.status === 'Cerrado Ganado' ? "bg-emerald-500" :
                                          lead.status === 'Cerrado Perdido' ? "bg-rose-500" :
                                            lead.status === 'En Negociación' ? "bg-amber-500" :
                                              lead.status === 'Calificado' ? "bg-blue-500" : "bg-slate-400"
                                      )} />
                                      {lastMsg ? (
                                        <p className={cn("text-xs truncate", dm ? "text-slate-400" : "text-slate-500")}>
                                          {lastMsg.source === 'human' ? '↗ ' : lastMsg.role === 'assistant' ? '🤖 ' : ''}{lastMsg.content}
                                        </p>
                                      ) : (
                                        <p className={cn("text-xs italic", dm ? "text-slate-600" : "text-slate-400")}>Sin mensajes</p>
                                      )}
                                    </div>
                                  </div>
                                  {/* Delete on hover */}
                                  <button
                                    onClick={e => { e.stopPropagation(); deleteSelliaLead(lead.id); }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:bg-rose-500/15"
                                    title="Eliminar conversación"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ── Right: chat panel ── */}
                        <div className="flex-1 flex flex-col min-w-0">
                          {!selliaLead ? (
                            <div className={cn("flex-1 flex flex-col items-center justify-center gap-3", dm ? "text-slate-500" : "text-slate-400")}>
                              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", dm ? "bg-slate-800" : "bg-slate-100")}>
                                <MessageSquare className="w-8 h-8 opacity-40" />
                              </div>
                              <div className="text-center">
                                <p className={cn("text-sm font-medium", dm ? "text-slate-400" : "text-slate-600")}>Selecciona una conversación</p>
                                <p className="text-xs mt-0.5 opacity-60">o crea una nueva con el botón +</p>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Chat header */}
                              <div className={cn("px-4 py-2.5 border-b flex items-center justify-between gap-3", dm ? "border-slate-800 bg-slate-900/50" : cn(T.border, "bg-white"))}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0", dm ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600")}>
                                    {selliaLead.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className={cn("text-sm font-bold truncate", dm ? "text-white" : "text-slate-900")}>{selliaLead.name}</p>
                                    <div className="flex items-center gap-1.5">
                                      {selliaLead.company && <span className={cn("text-xs truncate", dm ? "text-slate-400" : "text-slate-500")}>{selliaLead.company}</span>}
                                      {selliaLead.phone_number && <span className={cn("text-[10px]", dm ? "text-slate-500" : "text-slate-400")}>· {selliaLead.phone_number}</span>}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium",
                                    selliaLead.status === 'Cerrado Ganado' ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
                                      selliaLead.status === 'Cerrado Perdido' ? "bg-rose-500/15 border-rose-500/30 text-rose-400" :
                                        selliaLead.status === 'En Negociación' ? "bg-amber-500/15 border-amber-500/30 text-amber-400" :
                                          selliaLead.status === 'Calificado' ? "bg-blue-500/15 border-blue-500/30 text-blue-400" :
                                            dm ? "bg-slate-800 border-slate-700 text-slate-400" : cn(T.bg50, T.border, "text-slate-500")
                                  )}>
                                    {selliaLead.status || 'Nuevo'}
                                  </span>
                                  <button
                                    onClick={toggleSelliaHumanMode}
                                    title={selliaHumanMode ? 'Respondiendo tú — clic para activar IA' : 'IA activa — clic para responder tú'}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                                      selliaHumanMode
                                        ? "bg-orange-500/15 border-orange-500/30 text-orange-400"
                                        : "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                                    )}
                                  >
                                    {selliaHumanMode ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                    {selliaHumanMode ? 'Tú' : 'IA'}
                                  </button>
                                  <button
                                    onClick={() => deleteSelliaLead(selliaLead.id)}
                                    className={cn("w-7 h-7 flex items-center justify-center rounded-lg border transition-colors text-rose-400 hover:bg-rose-500/15", dm ? "border-slate-700" : "border-slate-200")}
                                    title="Eliminar conversación"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Messages area */}
                              <div
                                className={cn("flex-1 overflow-y-auto px-4 py-3 space-y-1", dm ? "bg-[#0d1117]" : "bg-[#f0f2f5]")}
                                style={{ minHeight: 0 }}
                              >
                                {selliaMessages.length === 0 && (
                                  <div className="flex flex-col items-center justify-center h-full gap-2 opacity-40">
                                    <MessageSquare className="w-8 h-8" />
                                    <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-500")}>Sin mensajes aún</p>
                                  </div>
                                )}

                                {(messagesWithSeparators as any[]).map((item: any, i: number) => {
                                  if (item.type === 'separator') {
                                    return (
                                      <div key={`sep-${i}`} className="flex items-center gap-3 py-2">
                                        <div className={cn("flex-1 h-px", dm ? "bg-slate-800" : "bg-slate-300/50")} />
                                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", dm ? "bg-slate-800 text-slate-400" : "bg-white text-slate-500 shadow-sm")}>{item.label}</span>
                                        <div className={cn("flex-1 h-px", dm ? "bg-slate-800" : "bg-slate-300/50")} />
                                      </div>
                                    );
                                  }
                                  const { msg } = item;
                                  const isHuman = msg.source === 'human';
                                  const isProspect = msg.role === 'user';
                                  // IA = role assistant y NO fue enviado por humano
                                  const isAI = msg.role === 'assistant' && msg.source !== 'human';
                                  // Prospecto → izquierda | Operador + IA → derecha
                                  const isRight = !isProspect;
                                  // Checkmark solo para mensajes del operador
                                  const WaCheck = () => {
                                    if (!isHuman) return null;
                                    const st = msg.wa_status;
                                    if (st === 'read') return (
                                      <CheckCheck className="w-3.5 h-3.5 shrink-0" style={{ color: '#53bdeb' }} strokeWidth={2.5} />
                                    );
                                    if (st === 'delivered') return (
                                      <CheckCheck className="w-3.5 h-3.5 shrink-0 text-white/60" strokeWidth={2.5} />
                                    );
                                    return (
                                      <Check className="w-3 h-3 shrink-0 text-white/60" strokeWidth={2.5} />
                                    );
                                  };
                                  return (
                                    <div key={`msg-${item.idx}`} className={cn("flex mb-1", isRight ? "justify-end" : "justify-start")}>
                                      {/* Avatar izquierda: solo para prospecto */}
                                      {!isRight && (
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center mr-1.5 shrink-0 mt-auto mb-0.5 text-[9px] font-bold", dm ? "bg-slate-600 text-slate-300" : "bg-slate-300 text-slate-600")}>
                                          {(selliaLead?.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <div className={cn("max-w-[72%] flex flex-col", isRight ? "items-end" : "items-start")}>
                                        {/* Etiqueta encima de la burbuja */}
                                        {isHuman && (
                                          <span className="text-[9px] text-orange-400 font-semibold mb-0.5 px-1">Tú</span>
                                        )}
                                        {isAI && (
                                          <span className="text-[9px] text-purple-400 font-semibold mb-0.5 px-1">IA</span>
                                        )}
                                        {/* Burbuja derecha: naranja = operador, morado = IA */}
                                        {isRight ? (
                                          <div className={cn(
                                            "relative text-white rounded-2xl rounded-br-sm shadow-sm px-3 pt-2 pb-1.5 text-sm leading-relaxed max-w-full",
                                            isHuman ? "bg-orange-500" : "bg-purple-600"
                                          )}>
                                            <span className="pr-14">{msg.content}</span>
                                            <span className="absolute bottom-1.5 right-2 flex items-center gap-0.5 text-[9px] text-white/70 select-none whitespace-nowrap">
                                              {fmtTime(msg.created_at)}
                                              <WaCheck />
                                            </span>
                                          </div>
                                        ) : (
                                          /* Prospecto → izquierda */
                                          <>
                                            <div className={cn(
                                              "px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm rounded-bl-sm",
                                              dm ? "bg-slate-600/80 text-slate-100" : "bg-white text-slate-800 border border-slate-200"
                                            )}>
                                              {msg.content}
                                            </div>
                                            {msg.created_at && (
                                              <span className={cn("text-[9px] mt-0.5 px-1", dm ? "text-slate-600" : "text-slate-400")}>
                                                {fmtTime(msg.created_at)}
                                              </span>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {selliaAiTyping && (
                                  <div className="flex justify-start mb-1">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center mr-1.5 shrink-0", dm ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600")}>
                                      <Bot className="w-3 h-3" />
                                    </div>
                                    <div className={cn("px-3 py-2.5 rounded-2xl rounded-bl-sm shadow-sm", dm ? "bg-slate-700/90" : "bg-white")}>
                                      <div className="flex gap-1 items-center">
                                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                      </div>
                                    </div>
                                  </div>
                                )}
                                <div ref={selliaMsgEndRef} />
                              </div>

                              {/* Input area — only when human mode is ON */}
                              {selliaHumanMode ? (
                                <div className={cn("px-3 py-2.5 border-t flex items-end gap-2", dm ? "border-slate-800 bg-slate-900/80" : cn(T.border, "bg-white"))}>
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={selliaMsgInput}
                                      onChange={e => setSelliaMsgInput(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendSelliaMessage(); } }}
                                      placeholder="Escribe tu respuesta para enviar por WhatsApp..."
                                      disabled={selliaSending}
                                      autoFocus
                                      className={cn(
                                        "w-full px-4 py-2.5 rounded-2xl text-sm outline-none border transition-colors",
                                        dm ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-orange-500/50" : "bg-slate-100 border-transparent focus:bg-white focus:border-orange-300 text-slate-900 placeholder:text-slate-400"
                                      )}
                                    />
                                  </div>
                                  <button
                                    onClick={sendSelliaMessage}
                                    disabled={!selliaMsgInput.trim() || selliaSending}
                                    className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-orange-500 hover:bg-orange-400 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                                  >
                                    {selliaSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                  </button>
                                </div>
                              ) : (
                                <div className={cn("px-4 py-3 border-t flex items-center gap-3", dm ? "border-slate-800 bg-slate-900/60" : cn(T.border, "bg-purple-50/50"))}>
                                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", dm ? "bg-purple-500/20" : "bg-purple-100")}>
                                    <Bot className={cn("w-3.5 h-3.5", dm ? "text-purple-400" : "text-purple-600")} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs font-medium", dm ? "text-purple-300" : "text-purple-700")}>IA respondiendo automáticamente</p>
                                    <p className={cn("text-[10px] mt-0.5", dm ? "text-slate-500" : "text-slate-400")}>Activa "Tú" en el header para responder manualmente</p>
                                  </div>
                                  <button
                                    onClick={toggleSelliaHumanMode}
                                    className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0", dm ? "border-purple-500/30 text-purple-400 hover:bg-purple-500/15" : "border-purple-200 text-purple-600 hover:bg-purple-100")}
                                  >
                                    Tomar control
                                  </button>
                                </div>
                              )}

                              {/* Status bar */}
                              <div className={cn("px-4 py-1 border-t flex items-center gap-2 text-[10px]", dm ? "border-slate-800 bg-slate-900/50 text-slate-600" : "border-slate-100 bg-slate-50/80 text-slate-400")}>
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", selliaHumanMode ? "bg-orange-400" : "bg-purple-400")} />
                                {selliaHumanMode
                                  ? "Modo operador activo — ✓ enviado  ✓✓ entregado  ✓✓ azul leído"
                                  : "IA activa — la IA responde automáticamente los mensajes entrantes"}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            )}

            {/* ── Calendar ───────────────────────────────────────────────────── */}
            {activeSection === 'calendar' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className={cn("text-xl font-bold", dm ? "text-white" : "text-slate-900")}>Calendario de Sellia</h2>
                    <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>Citas agendadas por Sellia y eventos manuales.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Google Calendar */}
                    {googleCalStatus.connected ? (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <Check className="w-3.5 h-3.5" /> Google Calendar
                        </span>
                        <button
                          onClick={handleSyncGoogle}
                          disabled={gcalSyncing}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-500/10 text-sky-500 border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
                        >
                          <RefreshCw className={cn("w-3.5 h-3.5", gcalSyncing && "animate-spin")} /> Sincronizar
                        </button>
                        <button onClick={handleDisconnectGoogle} className={cn("p-1.5 rounded-lg transition-colors", dm ? "text-slate-500 hover:text-rose-400" : "text-slate-400 hover:text-rose-600")}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleConnectGoogle}
                        className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors", dm ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-slate-300 text-slate-700 hover:bg-slate-100")}
                      >
                        <Link2 className="w-4 h-4 text-sky-400" /> Conectar Google Calendar
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const now = new Date();
                        const start = new Date(now); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 1);
                        const end = new Date(start); end.setHours(end.getHours() + 1);
                        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                        setCalForm({ title: '', description: '', start_datetime: fmt(start), end_datetime: fmt(end), type: 'meeting' });
                        setShowCalModal(true);
                      }}
                      className={cn("flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors", T.btn)}
                    >
                      <Plus className="w-4 h-4" /> Nuevo Evento
                    </button>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-3">
                  <button onClick={prevMonth} className={cn("p-2 rounded-lg transition-colors", dm ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100")}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={nextMonth} className={cn("p-2 rounded-lg transition-colors", dm ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100")}>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <h3 className={cn("text-lg font-semibold", dm ? "text-white" : "text-slate-900")}>
                    {ADMIN_MONTHS[calCurrentDate.getMonth()]} {calCurrentDate.getFullYear()}
                  </h3>
                  {calendarLoading && <RefreshCw className={cn("w-4 h-4 animate-spin", T.iconCol)} />}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Month grid */}
                  <div className={cn("lg:col-span-2 rounded-xl border overflow-hidden", dm ? "bg-slate-900 border-slate-800" : "bg-white shadow-sm", T.border)}>
                    <div className="grid grid-cols-7">
                      {ADMIN_WEEKDAYS.map(d => (
                        <div key={d} className={cn("py-2 text-center text-xs font-semibold uppercase tracking-wider border-b", dm ? "text-slate-500 border-slate-800" : "text-slate-400 border-zinc-100")}>
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {getAdminMonthDays().map((day, idx) => {
                        const dayEvts = day ? getEventsForDay(day) : [];
                        const today = day ? (day.toDateString() === new Date().toDateString()) : false;
                        return (
                          <div key={idx} className={cn("min-h-[80px] p-1.5 border-b border-r text-sm", dm ? "border-slate-800" : "border-slate-200", !day ? (dm ? "bg-slate-900/50" : T.bg50s) : "")}>
                            {day && (
                              <>
                                <span className={cn("w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1", today ? T.todayBg : dm ? "text-slate-300" : "text-slate-700")}>
                                  {day.getDate()}
                                </span>
                                <div className="space-y-0.5">
                                  {dayEvts.slice(0, 2).map((ev: any) => (
                                    <div key={ev.id} className="text-xs px-1 py-0.5 rounded truncate" style={{ backgroundColor: (ev.color || '#6366f1') + '25', color: ev.color || '#6366f1' }}>
                                      {ev.title}
                                    </div>
                                  ))}
                                  {dayEvts.length > 2 && <div className={cn("text-xs px-1", dm ? "text-slate-500" : "text-slate-500")}>+{dayEvts.length - 2}</div>}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Upcoming events */}
                  <div className={cn("rounded-xl border overflow-hidden", dm ? "bg-slate-900 border-slate-800" : "bg-white shadow-sm", T.border)}>
                    <div className={cn("p-4 border-b", dm ? "border-slate-800" : T.border)}>
                      <p className={cn("font-semibold text-sm", dm ? "text-white" : "text-slate-900")}>Próximos Eventos</p>
                    </div>
                    <div className={cn("divide-y overflow-y-auto", dm ? "divide-slate-800" : "divide-slate-100")} style={{ maxHeight: 400 }}>
                      {calendarEvents
                        .filter(ev => new Date(ev.start_datetime) >= new Date())
                        .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))
                        .slice(0, 10)
                        .map(ev => (
                          <div key={ev.id} className={cn("p-3 flex items-start justify-between gap-2 transition-colors", dm ? "hover:bg-slate-800/40" : "hover:bg-slate-50")}>
                            <div className="flex items-start gap-2 min-w-0">
                              <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: ev.color || '#6366f1' }} />
                              <div className="min-w-0">
                                <p className={cn("text-sm font-medium truncate", dm ? "text-white" : "text-slate-900")}>{ev.title}</p>
                                <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>
                                  {new Date(ev.start_datetime).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  {' · '}{new Date(ev.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {ev.lead_name && <p className={cn("text-xs", dm ? "text-slate-500" : "text-slate-400")}>Lead: {ev.lead_name}</p>}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteCalEvent(ev.id)}
                              className={cn("p-1 rounded shrink-0 transition-colors", dm ? "text-slate-600 hover:text-rose-400" : "text-slate-300 hover:text-rose-500")}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      {calendarEvents.filter(ev => new Date(ev.start_datetime) >= new Date()).length === 0 && (
                        <div className={cn("p-6 text-center text-sm", dm ? "text-slate-500" : "text-slate-500")}>No hay eventos próximos.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Google Calendar toast */}
                {calToast && (
                  <div className={cn(
                    "fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-3",
                    calToast.ok
                      ? dm ? "bg-emerald-900 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : dm ? "bg-rose-900 border-rose-700 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-700"
                  )}>
                    {calToast.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {calToast.text}
                  </div>
                )}

                {/* Create event modal */}
                {showCalModal && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={cn("rounded-2xl shadow-2xl w-full max-w-md border", dm ? "bg-slate-900 border-slate-700" : T.bg50, T.border)}>
                      <div className={cn("px-6 py-4 border-b flex justify-between items-center", dm ? "border-slate-800" : T.border)}>
                        <h3 className={cn("font-semibold flex items-center gap-2", dm ? "text-white" : "text-slate-900")}>
                          <CalendarIcon className={cn("w-5 h-5", T.iconColMd)} /> Nuevo Evento
                        </h3>
                        <button onClick={() => setShowCalModal(false)} className={cn("transition-colors", dm ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <form onSubmit={createCalEvent} className="p-6 space-y-4">
                        <div>
                          <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Título *</label>
                          <input required value={calForm.title} onChange={e => setCalForm({ ...calForm, title: e.target.value })} placeholder="Demo con prospecto..." className={inputCls} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Inicio *</label>
                            <input required type="datetime-local" value={calForm.start_datetime} onChange={e => setCalForm({ ...calForm, start_datetime: e.target.value })} className={inputCls} />
                          </div>
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Fin *</label>
                            <input required type="datetime-local" value={calForm.end_datetime} onChange={e => setCalForm({ ...calForm, end_datetime: e.target.value })} className={inputCls} />
                          </div>
                        </div>
                        <div>
                          <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Descripción</label>
                          <textarea value={calForm.description} onChange={e => setCalForm({ ...calForm, description: e.target.value })} rows={2} className={cn(inputCls, "resize-none")} />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                          <button type="button" onClick={() => setShowCalModal(false)} className={cn("px-4 py-2 text-sm rounded-lg", dm ? "text-slate-400 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100")}>Cancelar</button>
                          <button type="submit" disabled={calSaving} className={cn("px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2", T.btn)}>
                            {calSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Crear
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Sub-admins ───────────────────────────────────────────────── */}
            {activeSection === 'subadmins' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={cn("text-xl font-bold", dm ? "text-white" : "text-slate-900")}>Sub-administradores</h2>
                    <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>Usuarios con acceso completo al panel excepto eliminar clientes.</p>
                  </div>
                  <button onClick={() => setShowCreateSubAdmin(true)} className={cn("flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors", T.btn)}>
                    <Plus className="w-4 h-4" /> Nuevo Sub-admin
                  </button>
                </div>
                <div className={cn("rounded-xl border overflow-hidden", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                  {subAdmins.length === 0 ? (
                    <div className={cn("py-12 text-center text-sm", dm ? "text-slate-500" : "text-slate-400")}>
                      No hay sub-administradores creados.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={cn("border-b text-xs uppercase tracking-wider", dm ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400")}>
                          <th className="px-6 py-3 text-left">Nombre</th>
                          <th className="px-6 py-3 text-left">Email</th>
                          <th className="px-6 py-3 text-left">Empresa</th>
                          <th className="px-6 py-3 text-left">Creado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subAdmins.map((sa, i) => (
                          <tr key={sa.id} className={cn("border-b transition-colors", dm ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-slate-50", i === subAdmins.length - 1 && "border-0")}>
                            <td className={cn("px-6 py-4 font-medium", dm ? "text-white" : "text-slate-900")}>{sa.name || '—'}</td>
                            <td className={cn("px-6 py-4", dm ? "text-slate-300" : "text-slate-600")}>{sa.email}</td>
                            <td className={cn("px-6 py-4", dm ? "text-slate-400" : "text-slate-500")}>{sa.company || '—'}</td>
                            <td className={cn("px-6 py-4", dm ? "text-slate-500" : "text-slate-400")}>{sa.created_at ? new Date(sa.created_at).toLocaleDateString('es-ES') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {/* Create sub-admin modal */}
                {showCreateSubAdmin && (
                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={cn("rounded-2xl shadow-2xl w-full max-w-md border", dm ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
                      <div className={cn("px-6 py-4 border-b flex justify-between items-center", dm ? "border-slate-800" : "border-slate-100")}>
                        <h3 className={cn("font-semibold text-lg", dm ? "text-white" : "text-slate-900")}>Nuevo Sub-administrador</h3>
                        <button onClick={() => setShowCreateSubAdmin(false)} className={cn("transition-colors", dm ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}><X className="w-5 h-5" /></button>
                      </div>
                      <div className="p-6 space-y-4">
                        {subAdminError && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 px-4 py-3 rounded-xl text-sm">{subAdminError}</div>}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Nombre</label>
                            <input value={newSubAdmin.name} onChange={e => setNewSubAdmin({ ...newSubAdmin, name: e.target.value })} placeholder="Admin" className={inputCls} />
                          </div>
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Empresa</label>
                            <input value={newSubAdmin.company} onChange={e => setNewSubAdmin({ ...newSubAdmin, company: e.target.value })} placeholder="Interna" className={inputCls} />
                          </div>
                        </div>
                        <div>
                          <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Email *</label>
                          <input type="email" value={newSubAdmin.email} onChange={e => setNewSubAdmin({ ...newSubAdmin, email: e.target.value })} placeholder="admin@empresa.com" className={inputCls} />
                        </div>
                        <div>
                          <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Contraseña *</label>
                          <input type="password" value={newSubAdmin.password} onChange={e => setNewSubAdmin({ ...newSubAdmin, password: e.target.value })} placeholder="Mínimo 6 caracteres" className={inputCls} />
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                          <button onClick={() => setShowCreateSubAdmin(false)} className={cn("px-4 py-2 text-sm rounded-lg transition-colors", dm ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100")}>Cancelar</button>
                          <button onClick={createSubAdmin} disabled={subAdminSaving} className={cn("px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2", T.btn)}>
                            {subAdminSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Crear
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── WhatsApp per client ─────────────────────────────────────────── */}
            {activeSection === 'whatsapp_clients' && (
              <div className="space-y-6">
                <div>
                  <h2 className={cn("text-xl font-bold", dm ? "text-white" : "text-slate-900")}>WhatsApp por Cliente</h2>
                  <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>Configura el WhatsApp Business de cada cliente.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Client list */}
                  <div className={cn("rounded-xl border overflow-hidden", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                    <div className={cn("px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider", dm ? "border-slate-800 text-slate-500" : "border-slate-100 text-slate-400")}>Clientes</div>
                    {users.filter(u => u.role !== 'superadmin' && u.role !== 'subadmin').map(u => (
                      <button
                        key={u.id}
                        onClick={() => { setWaClientId(u.id); loadWaConfig(u.id); }}
                        className={cn(
                          "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors border-b last:border-0",
                          waClientId === u.id
                            ? cn(T.btn, "text-white border-transparent")
                            : dm ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-100 hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0", waClientId === u.id ? "bg-white/20 text-white" : T.iconBg)}>
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{u.name || u.email}</div>
                          <div className={cn("text-xs truncate", waClientId === u.id ? "text-white/70" : dm ? "text-slate-500" : "text-slate-400")}>{u.company || u.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {/* Config form */}
                  <div className="lg:col-span-2">
                    {!waClientId ? (
                      <div className={cn("rounded-xl border p-12 text-center text-sm", dm ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400")}>
                        Selecciona un cliente para configurar su WhatsApp.
                      </div>
                    ) : waLoading ? (
                      <div className={cn("rounded-xl border p-12 text-center", dm ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-white border-slate-200 text-slate-400")}>
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                      </div>
                    ) : (
                      <div className={cn("rounded-xl border", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                        <div className={cn("px-6 py-4 border-b", dm ? "border-slate-800" : "border-slate-100")}>
                          <h3 className={cn("font-semibold", dm ? "text-white" : "text-slate-900")}>
                            WhatsApp — {users.find(u => u.id === waClientId)?.name || ''}
                          </h3>
                          {waConfigSaved?.configured && (
                            <div className="mt-1 flex items-center gap-2 text-xs text-emerald-500">
                              <Check className="w-3 h-3" /> Configurado · Verify Token: <span className="font-mono">{waConfigSaved.verifyToken}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-6 space-y-4">
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Phone Number ID *</label>
                            <input value={waConfig.phoneNumberId} onChange={e => setWaConfig({ ...waConfig, phoneNumberId: e.target.value })} placeholder="123456789" className={inputCls} />
                          </div>
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Access Token *</label>
                            <input type="password" value={waConfig.accessToken} onChange={e => setWaConfig({ ...waConfig, accessToken: e.target.value })} placeholder="EAAxxxx..." className={inputCls} />
                            <p className={cn("text-xs mt-1", dm ? "text-slate-500" : "text-slate-400")}>Déjalo vacío para mantener el token actual</p>
                          </div>
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Business Account ID</label>
                            <input value={waConfig.businessAccountId} onChange={e => setWaConfig({ ...waConfig, businessAccountId: e.target.value })} placeholder="Opcional" className={inputCls} />
                          </div>
                          <div>
                            <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Nombre del número</label>
                            <input value={waConfig.displayName} onChange={e => setWaConfig({ ...waConfig, displayName: e.target.value })} placeholder="Ej: Soporte Empresa X" className={inputCls} />
                          </div>
                          <div className="flex justify-end pt-2">
                            <button onClick={saveWaConfig} disabled={waSaving || !waConfig.phoneNumberId} className={cn("px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2", T.btn)}>
                              {waSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar configuración
                            </button>
                          </div>
                          {waToast && (
                            <div className={cn("px-4 py-3 rounded-xl text-sm border", waToast.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-rose-500/10 border-rose-500/30 text-rose-500")}>
                              {waToast.msg}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── WhatsApp Sellia ──────────────────────────────────────────────── */}
            {activeSection === 'whatsapp_sellia' && (
              <div className="space-y-6">
                <div>
                  <h2 className={cn("text-xl font-bold", dm ? "text-white" : "text-slate-900")}>WhatsApp de Sellia</h2>
                  <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>Configura el número de WhatsApp Business propio de Sellia para los chats del agente Sellia.</p>
                </div>
                <div className="max-w-xl">
                  <div className={cn("rounded-xl border", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                    <div className={cn("px-6 py-4 border-b", dm ? "border-slate-800" : "border-slate-100")}>
                      <h3 className={cn("font-semibold", dm ? "text-white" : "text-slate-900")}>WhatsApp — Sellia</h3>
                      {selliaWaConfigSaved?.configured && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-emerald-500">
                          <Check className="w-3 h-3" /> Configurado · Verify Token: <span className="font-mono">{selliaWaConfigSaved.verifyToken}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Phone Number ID *</label>
                        <input value={selliaWaConfig.phoneNumberId} onChange={e => setSelliaWaConfig({ ...selliaWaConfig, phoneNumberId: e.target.value })} placeholder="123456789" className={inputCls} />
                      </div>
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Access Token *</label>
                        <input type="password" value={selliaWaConfig.accessToken} onChange={e => setSelliaWaConfig({ ...selliaWaConfig, accessToken: e.target.value })} placeholder="EAAxxxx..." className={inputCls} />
                        <p className={cn("text-xs mt-1", dm ? "text-slate-500" : "text-slate-400")}>Déjalo vacío para mantener el token actual</p>
                      </div>
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Business Account ID</label>
                        <input value={selliaWaConfig.businessAccountId} onChange={e => setSelliaWaConfig({ ...selliaWaConfig, businessAccountId: e.target.value })} placeholder="Opcional" className={inputCls} />
                      </div>
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Nombre del número</label>
                        <input value={selliaWaConfig.displayName} onChange={e => setSelliaWaConfig({ ...selliaWaConfig, displayName: e.target.value })} placeholder="Ej: Sellia Ventas" className={inputCls} />
                      </div>
                      <div className="flex justify-end pt-2">
                        <button onClick={saveSelliaWaConfig} disabled={selliaWaSaving || !selliaWaConfig.phoneNumberId} className={cn("px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2", T.btn)}>
                          {selliaWaSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar configuración
                        </button>
                      </div>
                      {selliaWaToast && (
                        <div className={cn("px-4 py-3 rounded-xl text-sm border", selliaWaToast.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-rose-500/10 border-rose-500/30 text-rose-500")}>
                          {selliaWaToast.msg}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Chat History ────────────────────────────────────────────────── */}
            {activeSection === 'history' && (
              <div className="space-y-6">
                <div>
                  <h2 className={cn("text-xl font-bold", dm ? "text-white" : "text-slate-900")}>Historial de Chats</h2>
                  <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>Revisa los chats de Sellia con clientes para verificar el comportamiento del agente.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ height: '70vh', minHeight: 480 }}>
                  {/* Client list */}
                  <div className={cn("rounded-xl border overflow-y-auto", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                    <div className={cn("px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider sticky top-0", dm ? "border-slate-800 text-slate-500 bg-slate-900" : "border-slate-100 text-slate-400 bg-white")}>Clientes</div>
                    {users.filter(u => u.role !== 'superadmin' && u.role !== 'subadmin').map(u => (
                      <button
                        key={u.id}
                        onClick={() => loadHistLeads(u.id)}
                        className={cn(
                          "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors border-b last:border-0",
                          histUserId === u.id
                            ? cn(T.btn, "text-white border-transparent")
                            : dm ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-100 hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0", histUserId === u.id ? "bg-white/20 text-white" : T.iconBg)}>
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm truncate font-medium">{u.name || u.email}</span>
                      </button>
                    ))}
                  </div>
                  {/* Leads list */}
                  <div className={cn("rounded-xl border overflow-y-auto", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                    <div className={cn("px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider sticky top-0", dm ? "border-slate-800 text-slate-500 bg-slate-900" : "border-slate-100 text-slate-400 bg-white")}>
                      Leads {histLoading && <RefreshCw className="w-3 h-3 animate-spin inline ml-1" />}
                    </div>
                    {!histUserId ? (
                      <p className={cn("px-4 py-6 text-sm text-center", dm ? "text-slate-600" : "text-slate-400")}>Selecciona un cliente</p>
                    ) : histError ? (
                      <p className="px-4 py-6 text-sm text-center text-rose-400">{histError}</p>
                    ) : histLoading ? (
                      <div className="px-4 py-6 flex justify-center"><RefreshCw className="w-5 h-5 animate-spin text-slate-500" /></div>
                    ) : histLeads.length === 0 ? (
                      <p className={cn("px-4 py-6 text-sm text-center", dm ? "text-slate-600" : "text-slate-400")}>Sin leads</p>
                    ) : histLeads.map(lead => (
                      <button
                        key={lead.id}
                        onClick={() => loadHistMessages(lead.id)}
                        className={cn(
                          "w-full px-4 py-3 text-left transition-colors border-b last:border-0",
                          histLead?.id === lead.id
                            ? cn(T.btn, "text-white border-transparent")
                            : dm ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-100 hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <div className="font-medium text-sm truncate">{lead.name || 'Lead sin nombre'}</div>
                        <div className={cn("text-xs mt-0.5", histLead?.id === lead.id ? "text-white/70" : dm ? "text-slate-500" : "text-slate-400")}>{lead.status} · {lead.channel}</div>
                      </button>
                    ))}
                  </div>
                  {/* Messages */}
                  <div className={cn("lg:col-span-2 rounded-xl border flex flex-col", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                    <div className={cn("px-4 py-3 border-b flex items-center gap-3", dm ? "border-slate-800" : "border-slate-100")}>
                      {histLead ? (
                        <>
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", T.iconBg)}>{(histLead.name || 'L').charAt(0)}</div>
                          <div>
                            <div className={cn("font-semibold text-sm", dm ? "text-white" : "text-slate-900")}>{histLead.name || 'Lead sin nombre'}</div>
                            <div className={cn("text-xs", dm ? "text-slate-500" : "text-slate-400")}>{histLead.status} · {histLead.channel} {histMsgLoading && '· cargando...'}</div>
                          </div>
                        </>
                      ) : (
                        <span className={cn("text-sm", dm ? "text-slate-500" : "text-slate-400")}>Selecciona un lead para ver el chat</span>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {histMessages.map((msg, i) => (
                        <div key={i} className={cn("flex", msg.role === 'assistant' ? "justify-start" : "justify-end")}>
                          <div className={cn(
                            "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm",
                            msg.role === 'assistant'
                              ? dm ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-800"
                              : cn(T.btn, "text-white")
                          )}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            {msg.created_at && <p className={cn("text-xs mt-1 opacity-60")}>{new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>}
                          </div>
                        </div>
                      ))}
                      <div ref={histEndRef} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI config toast */}
            {aiToast && (
              <div className={cn(
                "fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-3",
                aiToast.ok
                  ? dm ? "bg-emerald-900 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : dm ? "bg-rose-900 border-rose-700 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-700"
              )}>
                <span>{aiToast.ok ? '✓' : '✕'}</span>
                {aiToast.msg}
              </div>
            )}

            {/* Notification toast popup */}
            {notifToast && (
              <div className="fixed bottom-6 right-6 z-[60] w-80 rounded-2xl shadow-2xl border border-slate-700 bg-slate-900 text-white overflow-hidden animate-in slide-in-from-bottom-4">
                <div className={cn("px-4 py-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider", T.btn)}>
                  <span className="flex items-center gap-2"><Bell className="w-3.5 h-3.5" /> Chat sin actividad</span>
                  <button onClick={() => setNotifToast(null)} className="opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="px-4 py-3 space-y-1">
                  <p className="font-semibold text-sm">{notifToast.leadName}</p>
                  <p className="text-xs text-slate-400">Cliente: {notifToast.clientName}</p>
                  <p className="text-xs text-slate-400">Estado: <span className="text-slate-300">{notifToast.status}</span> · {notifToast.messageCount} mensajes</p>
                  {notifToast.lastMessage && <p className="text-xs text-slate-500 italic truncate">"{notifToast.lastMessage}"</p>}
                </div>
                <div className="px-4 pb-3">
                  <button
                    onClick={() => { setNotifToast(null); setHistUserId(notifToast.clientId); loadHistLeads(notifToast.clientId); setActiveSection('history'); }}
                    className={cn("w-full py-1.5 text-xs font-medium rounded-lg text-white transition-colors", T.btn)}
                  >
                    Ver historial de chat
                  </button>
                </div>
              </div>
            )}
            {/* ── Email & Notificaciones ─────────────────────────────────────── */}
            {activeSection === 'email_config' && (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h2 className={cn("text-xl font-bold", dm ? "text-white" : "text-slate-900")}>Email & Notificaciones</h2>
                  <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>Configura el servidor SMTP global que Sellia usa para enviar emails a admins y clientes.</p>
                </div>

                <div className={cn("rounded-xl border", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                  <div className={cn("px-6 py-4 border-b flex items-center justify-between", dm ? "border-slate-800" : "border-slate-100")}>
                    <div>
                      <h3 className={cn("font-semibold", dm ? "text-white" : "text-slate-900")}>Configuración SMTP</h3>
                      <p className={cn("text-xs mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>Compatible con Gmail (App Password), Resend, Brevo, Mailgun, etc.</p>
                    </div>
                    <div
                      className={cn("w-11 h-6 rounded-full transition-colors shrink-0 relative cursor-pointer", smtp.enabled ? "bg-emerald-500" : dm ? "bg-slate-700" : "bg-slate-300")}
                      onClick={() => setSmtp(p => ({ ...p, enabled: !p.enabled }))}
                    >
                      <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform", smtp.enabled ? "translate-x-5 left-0.5" : "translate-x-0 left-0.5")} />
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Host SMTP *</label>
                        <input value={smtp.host} onChange={e => setSmtp(p => ({ ...p, host: e.target.value }))} placeholder="smtp.gmail.com" className={inputCls} />
                      </div>
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Puerto *</label>
                        <input type="number" value={smtp.port} onChange={e => setSmtp(p => ({ ...p, port: e.target.value }))} placeholder="587" className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Usuario / Email *</label>
                        <input value={smtp.user} onChange={e => setSmtp(p => ({ ...p, user: e.target.value }))} placeholder="tu@email.com" className={inputCls} />
                      </div>
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Contraseña / App Password *</label>
                        <input type="password" value={smtp.pass} onChange={e => setSmtp(p => ({ ...p, pass: e.target.value }))} placeholder="••••••••" className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Nombre del remitente</label>
                        <input value={smtp.fromName} onChange={e => setSmtp(p => ({ ...p, fromName: e.target.value }))} placeholder="Sellia" className={inputCls} />
                      </div>
                      <div>
                        <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Email del remitente</label>
                        <input type="email" value={smtp.fromEmail} onChange={e => setSmtp(p => ({ ...p, fromEmail: e.target.value }))} placeholder="noreply@tuempresa.com" className={inputCls} />
                      </div>
                    </div>
                    <div
                      className={cn("flex items-center gap-2 cursor-pointer select-none", dm ? "text-slate-300" : "text-slate-600")}
                      onClick={() => setSmtp(p => ({ ...p, secure: !p.secure }))}
                    >
                      <div className={cn("w-4 h-4 rounded border flex items-center justify-center flex-shrink-0", smtp.secure ? "bg-emerald-500 border-emerald-500" : dm ? "border-slate-600" : "border-slate-300")}>
                        {smtp.secure && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm">Usar SSL/TLS (puerto 465 — desactiva para STARTTLS en 587)</span>
                    </div>

                    {smtpToast && (
                      <div className={cn("px-4 py-3 rounded-xl text-sm border", smtpToast.ok ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400")}>
                        {smtpToast.msg}
                      </div>
                    )}

                    {/* Test email row */}
                    <div className={cn("p-3 rounded-lg border", dm ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50")}>
                      <p className={cn("text-xs font-medium mb-2", dm ? "text-slate-400" : "text-slate-500")}>Probar configuración — enviar email de prueba a:</p>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={smtpTestEmail}
                          onChange={e => setSmtpTestEmail(e.target.value)}
                          placeholder="tu@email.com"
                          className={cn(inputCls, "flex-1")}
                        />
                        <button onClick={testSmtp} disabled={smtpTesting || !smtp.host} className={cn("px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-40 transition-colors whitespace-nowrap", T.btn, "text-white")}>
                          {smtpTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Enviar prueba
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                      <button onClick={saveSmtp} disabled={smtpSaving} className={cn("px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 flex items-center gap-2", T.btn)}>
                        {smtpSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Guardar SMTP
                      </button>
                    </div>
                  </div>
                </div>

                <div className={cn("rounded-xl border p-5", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                  <h3 className={cn("font-semibold mb-1", dm ? "text-white" : "text-slate-900")}>¿Cómo funciona?</h3>
                  <ul className={cn("text-sm space-y-2 mt-3", dm ? "text-slate-400" : "text-slate-600")}>
                    <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Cada usuario configura su email de notificaciones en <strong>Settings → Notificaciones</strong></li>
                    <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Cuando la IA agenda una cita, cierra una venta o llega un nuevo lead → se envía email al usuario</li>
                    <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> El cliente (lead) recibe confirmación por <strong>WhatsApp</strong> automáticamente</li>
                    <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Los superadmins siempre reciben notificación in-app de todos los eventos</li>
                    <li className="flex items-start gap-2"><span className="text-blue-400 mt-0.5">💡</span> Para Gmail: activa <em>verificación en 2 pasos</em> y genera una <em>App Password</em> en tu cuenta Google</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ── Collections Admin ─────────────────────────────────────────── */}
            {activeSection === 'collections_admin' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={cn("text-xl font-bold", dm ? "text-white" : "text-slate-900")}>Cobranza Automatizada</h2>
                    <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>Todos los planes de pago y recordatorios activos en la plataforma.</p>
                  </div>
                  <button
                    onClick={async () => {
                      setAdminSchedulerRunning(true);
                      try { await api.runCollectionScheduler(); } catch {}
                      setAdminSchedulerRunning(false);
                      api.getAllCollections().then(setAdminCollections).catch(() => {});
                    }}
                    disabled={adminSchedulerRunning}
                    className={cn("flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50", T.btn)}
                  >
                    {adminSchedulerRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Ejecutar recordatorios ahora
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Total Planes', value: adminCollections.length, color: 'text-violet-500' },
                    { label: 'Activos', value: adminCollections.filter(p => p.status === 'active').length, color: 'text-emerald-500' },
                    { label: 'Cuotas Pendientes', value: adminCollections.reduce((s, p) => s + (p.installments?.filter((i: any) => i.status === 'pending').length || 0), 0), color: 'text-amber-500' },
                    { label: 'Cuotas Vencidas', value: adminCollections.reduce((s, p) => s + (p.installments?.filter((i: any) => i.status === 'overdue').length || 0), 0), color: 'text-rose-500' },
                  ].map(stat => (
                    <div key={stat.label} className={cn("rounded-xl border p-4", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                      <p className={cn("text-xs font-medium", dm ? "text-slate-400" : "text-slate-500")}>{stat.label}</p>
                      <p className={cn("text-2xl font-bold mt-1", stat.color)}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Plans Table */}
                <div className={cn("rounded-xl border overflow-hidden", dm ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
                  {adminCollectionsLoading ? (
                    <div className="p-12 text-center">
                      <RefreshCw className={cn("w-6 h-6 animate-spin mx-auto mb-2", dm ? "text-slate-400" : "text-slate-400")} />
                      <p className={cn("text-sm", dm ? "text-slate-400" : "text-slate-500")}>Cargando planes...</p>
                    </div>
                  ) : adminCollections.length === 0 ? (
                    <div className="p-12 text-center">
                      <DollarSign className={cn("w-8 h-8 mx-auto mb-2 opacity-30", dm ? "text-slate-400" : "text-slate-500")} />
                      <p className={cn("text-sm", dm ? "text-slate-400" : "text-slate-500")}>No hay planes de cobranza creados.</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={cn("border-b text-xs font-medium", dm ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500")}>
                          <th className="text-left px-4 py-3">Plan</th>
                          <th className="text-left px-4 py-3">Deudor</th>
                          <th className="text-left px-4 py-3">Cliente Sellia</th>
                          <th className="text-left px-4 py-3">Total</th>
                          <th className="text-left px-4 py-3">Progreso</th>
                          <th className="text-left px-4 py-3">Próx. vence</th>
                          <th className="text-left px-4 py-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminCollections.map(plan => {
                          const total = plan.installments?.length || 0;
                          const paid = plan.installments?.filter((i: any) => i.status === 'paid').length || 0;
                          const hasOverdue = plan.installments?.some((i: any) => i.status === 'overdue');
                          return (
                            <tr key={plan.id} className={cn("border-b last:border-0", dm ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-50 hover:bg-slate-50")}>
                              <td className={cn("px-4 py-3 font-medium", dm ? "text-white" : "text-slate-900")}>{plan.name}</td>
                              <td className={cn("px-4 py-3", dm ? "text-slate-300" : "text-slate-600")}>
                                <div>{plan.debtor_name}</div>
                                <div className={cn("text-xs", dm ? "text-slate-500" : "text-slate-400")}>{plan.debtor_phone}</div>
                              </td>
                              <td className={cn("px-4 py-3", dm ? "text-slate-300" : "text-slate-600")}>
                                <div>{plan.user_name}</div>
                                <div className={cn("text-xs", dm ? "text-slate-500" : "text-slate-400")}>{plan.user_company}</div>
                              </td>
                              <td className={cn("px-4 py-3 font-medium", dm ? "text-white" : "text-slate-900")}>${Number(plan.total_amount).toLocaleString('es-CL')}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={cn("flex-1 h-1.5 rounded-full max-w-16", dm ? "bg-slate-700" : "bg-slate-200")}>
                                    <div className="h-full rounded-full bg-emerald-500" style={{ width: total ? `${(paid/total)*100}%` : '0%' }} />
                                  </div>
                                  <span className={cn("text-xs", dm ? "text-slate-400" : "text-slate-500")}>{paid}/{total}</span>
                                </div>
                              </td>
                              <td className={cn("px-4 py-3 text-xs", dm ? "text-slate-300" : "text-slate-600")}>{plan.nextDue || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                  plan.status === 'completed' ? 'bg-blue-500/10 text-blue-500' :
                                  hasOverdue ? 'bg-rose-500/10 text-rose-500' :
                                  plan.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                                  'bg-slate-500/10 text-slate-500'
                                )}>
                                  {plan.status === 'completed' ? 'Completado' : hasOverdue ? 'Con mora' : plan.status === 'active' ? 'Activo' : 'Pausado'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={cn("rounded-2xl shadow-2xl w-full max-w-md border", dm ? "bg-slate-900 border-slate-700" : T.bg50, T.border)}>
            <div className={cn("px-6 py-4 border-b flex justify-between items-center", dm ? "border-slate-800" : T.border)}>
              <h3 className={cn("font-semibold text-lg flex items-center gap-2", dm ? "text-white" : "text-slate-900")}>
                <Plus className={cn("w-5 h-5", T.iconColMd)} /> Nuevo Cliente
              </h3>
              <button onClick={() => setShowCreate(false)} className={cn("transition-colors", dm ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 px-4 py-3 rounded-xl text-sm">
                  {createError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Nombre</label>
                  <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Juan García" className={inputCls} />
                </div>
                <div>
                  <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Empresa</label>
                  <input value={newUser.company} onChange={e => setNewUser({ ...newUser, company: e.target.value })} placeholder="Acme Corp" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Email *</label>
                <input type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="cliente@empresa.com" className={inputCls} />
              </div>
              <div>
                <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Contraseña *</label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    required
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className={cn(inputCls, "pr-10")}
                  />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className={cn("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", dm ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={cn("block text-xs font-medium mb-1.5", dm ? "text-slate-400" : "text-slate-500")}>Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLANS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewUser({ ...newUser, plan: p })}
                      className={cn(
                        "py-2 px-3 rounded-lg text-xs font-medium border transition-colors",
                        newUser.plan === p
                          ? cn(T.btn, "border-transparent text-white")
                          : dm ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500" : cn("bg-white text-slate-600 hover:border-slate-400", T.border)
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className={cn("px-4 py-2 text-sm rounded-lg transition-colors", dm ? "text-slate-400 hover:text-white hover:bg-slate-800" : cn("text-slate-500", T.hover100))}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={cn("px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2", T.btn)}
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Features Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={cn("rounded-2xl shadow-2xl w-full max-w-md border", dm ? "bg-slate-900 border-slate-700" : T.bg50, T.border)}>
            <div className={cn("px-6 py-4 border-b flex justify-between items-center", dm ? "border-slate-800" : T.border)}>
              <div>
                <h3 className={cn("font-semibold text-lg", dm ? "text-white" : "text-slate-900")}>Permisos del Cliente</h3>
                <p className={cn("text-sm mt-0.5", dm ? "text-slate-400" : "text-slate-500")}>{editingUser.name || editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className={cn("transition-colors", dm ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Plan selector */}
              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-2", dm ? "text-slate-400" : "text-slate-500")}>Plan</label>
                <div className="grid grid-cols-3 gap-2">
                  {PLANS.map(p => (
                    <button
                      key={p}
                      onClick={() => {
                        const features = PLAN_FEATURES[p];
                        setEditFeatures({ ...editFeatures, plan: p, ...features });
                      }}
                      className={cn(
                        "py-2 px-3 rounded-lg text-xs font-medium border transition-colors",
                        editFeatures.plan === p
                          ? cn(T.btn, "border-transparent text-white")
                          : dm ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500" : cn("bg-white text-slate-600 hover:border-slate-400", T.border)
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modules */}
              <div>
                <label className={cn("block text-xs font-semibold uppercase tracking-wider mb-2", dm ? "text-slate-400" : "text-slate-500")}>Módulos Habilitados</label>
                <div className="space-y-2">
                  {FEATURE_LABELS.map(f => (
                    <div
                      key={f.key}
                      onClick={() => setEditFeatures({ ...editFeatures, [f.key]: !editFeatures[f.key] })}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors",
                        editFeatures[f.key]
                          ? T.featureOn
                          : dm ? "bg-slate-800 border-slate-700 hover:border-slate-600" : cn(T.bg50s, T.border, "hover:border-zinc-300")
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <f.icon className={cn("w-4 h-4", editFeatures[f.key] ? T.iconColMd : dm ? "text-slate-500" : "text-slate-500")} />
                        <span className={cn("text-sm font-medium", editFeatures[f.key] ? (dm ? "text-white" : "text-slate-900") : dm ? "text-slate-400" : "text-slate-500")}>
                          {f.label}
                        </span>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        editFeatures[f.key] ? T.toggleOn : dm ? "border-slate-600" : "border-zinc-300"
                      )}>
                        {editFeatures[f.key] && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button onClick={() => setEditingUser(null)} className={cn("px-4 py-2 text-sm rounded-lg transition-colors", dm ? "text-slate-400 hover:text-white hover:bg-slate-800" : cn("text-slate-500", T.hover100))}>
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFeatures}
                  disabled={saving}
                  className={cn("px-5 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2", T.btn)}
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Guardar Permisos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Close plan dropdown on outside click */}
      {planDropdown !== null && (
        <div className="fixed inset-0 z-20" onClick={() => setPlanDropdown(null)} />
      )}
    </div>
  );
}
