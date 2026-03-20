import { useState, useRef, useEffect } from "react";
import {
  MessageSquare, Send, BrainCircuit, Target, User, Bot,
  Sparkles, CheckCircle2, Search, Filter,
  Tag, X, Check, Plus, Trash2, MessageCircle
} from "lucide-react";
import { addNotification } from "@/lib/notifications";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const initialKnowledge = `Somos "TechBoost Agency", una agencia de marketing B2B.
Servicios que ofrecemos:
- SEO B2B: $500/mes (Incluye auditoría, 4 artículos, linkbuilding básico).
- Gestión de Ads (Google/LinkedIn): $800/mes (No incluye presupuesto publicitario).
- Consultoría Estratégica: $150/hora.

No ofrecemos:
- Gestión de Redes Sociales (Community Management).
- Creación de logos o branding.

Políticas:
- Contratos mínimos de 3 meses.
- Soporte de Lunes a Viernes de 9am a 6pm.
- No damos descuentos en el primer mes.`;

const defaultInsights = {
  demographics: "Sin datos suficientes",
  interests: [],
  painPoints: [],
  needs: [],
  opportunities: [],
  buyingIntent: "Desconocida",
  platformParams: {
    meta: "Esperando más interacciones...",
    google: "Esperando más interacciones...",
    linkedin: "Esperando más interacciones..."
  }
};

const initialChats: any[] = [];

type ChatStatus = 'Nuevo' | 'Calificado' | 'En Negociación' | 'Cerrado Ganado' | 'Cerrado Perdido';

export default function Chats() {
  const [activeTab, setActiveTab] = useState<'lead' | 'audience' | 'debug'>('lead');
  const [lastDebugInfo, setLastDebugInfo] = useState<{ estado: string; parts: string[]; contextLength: number; kbPreview: string } | null>(null);
  const [agentName, setAgentName] = useState('Agente IA');
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [knowledgeBase, setKnowledgeBase] = useState(initialKnowledge);
  const [chats, setChats] = useState<any[]>([]);

  const [isTraining, setIsTraining] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string, size: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeChatId, setActiveChatId] = useState(chats[0]?.id || null);
  const activeChat = chats.find((c: any) => c.id === activeChatId) || chats[0] || null;

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isUpdatingAudience, setIsUpdatingAudience] = useState(false);
  const [saleToast, setSaleToast] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [editingScore, setEditingScore] = useState(false);
  const [scoreInput, setScoreInput] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyInput, setCompanyInput] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener("storage", syncTheme);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (activeChat?.messages) {
      scrollToBottom();
    }
  }, [activeChat?.messages]);

  // Load data from backend API
  useEffect(() => {
    const loadData = async () => {
      try {
        const [leadsData, kbData, agentData] = await Promise.all([
          api.getLeads(),
          api.getKnowledge(),
          api.getAgentName()
        ]);
        setChats(leadsData);
        if (leadsData.length > 0) setActiveChatId(leadsData[0].id);
        if (kbData?.content) setKnowledgeBase(kbData.content);
        if (agentData?.agentName) setAgentName(agentData.agentName);
      } catch (err) {
        console.error('Error loading chats data:', err);
      }
    };
    loadData();
  }, []);

  // Poll messages for the active chat every 3s (picks up WhatsApp messages in real time)
  useEffect(() => {
    if (!activeChatId) return;
    const poll = setInterval(async () => {
      try {
        const msgs = await api.getMessages(activeChatId);
        setChats(prev => prev.map(c =>
          c.id === activeChatId ? { ...c, messages: msgs } : c
        ));
      } catch {}
    }, 3000);
    return () => clearInterval(poll);
  }, [activeChatId]);

  // Poll leads list every 15s to pick up new leads from WhatsApp
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const leadsData = await api.getLeads();
        setChats(prev => {
          const merged = leadsData.map((lead: any) => {
            const existing = prev.find((c: any) => c.id === lead.id);
            // Keep local messages if we already have them (message poll handles updates)
            return existing ? { ...lead, messages: existing.messages, insights: existing.insights } : lead;
          });
          return merged;
        });
      } catch {}
    }, 15000);
    return () => clearInterval(poll);
  }, []);

  const handleSaveKnowledge = async () => {
    setIsTraining(true);
    try {
      await api.updateKnowledge(knowledgeBase);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving knowledge:', err);
    } finally {
      setIsTraining(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFile = files[0];
    const fileData = {
      name: newFile.name,
      size: (newFile.size / 1024).toFixed(1) + ' KB'
    };

    setUploadedFiles([...uploadedFiles, fileData]);

    // Simulate processing the document
    setTimeout(() => {
      setKnowledgeBase(prev => prev + `\n\n[Documento procesado: ${newFile.name}]\nContenido indexado y listo para ser usado por el agente.`);
    }, 1000);
  };

  const updateActiveChat = async (updates: any) => {
    setChats(chats.map((c: any) => c.id === activeChatId ? { ...c, ...updates } : c));
    try {
      if (
        updates.status ||
        updates.score !== undefined ||
        updates.humanMode !== undefined ||
        updates.tags ||
        updates.name ||
        updates.company
      ) {
        await api.updateLead(activeChatId!, updates);
      }
    } catch (err) {
      console.error('Error updating lead:', err);
    }
  };

  const handleStatusChange = (status: ChatStatus) => {
    updateActiveChat({ status });
    if (status === 'Cerrado Ganado') {
      addNotification({
        type: 'success',
        title: '¡Nuevo Cierre!',
        message: `${activeChat.name} ha cambiado su estado a Cerrado Ganado.`
      });
    }
  };

  const handleRemoveTag = (tag: string) => {
    const newTags = activeChat.tags.filter((t: string) => t !== tag);
    updateActiveChat({ tags: newTags });
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed || activeChat.tags.includes(trimmed)) return;
    updateActiveChat({ tags: [...activeChat.tags, trimmed] });
    setNewTagInput("");
    setShowTagInput(false);
  };

  const handleSaveScore = () => {
    const val = parseInt(scoreInput, 10);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      updateActiveChat({ score: val });
    }
    setEditingScore(false);
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) updateActiveChat({ name: trimmed });
    setEditingName(false);
  };

  const handleSaveCompany = () => {
    const trimmed = companyInput.trim();
    if (trimmed) updateActiveChat({ company: trimmed });
    setEditingCompany(false);
  };

  const handleSaveEmail = () => {
    const trimmed = emailInput.trim();
    updateActiveChat({ email: trimmed || null });
    setEditingEmail(false);
  };

  const extractAudienceInsights = async (chatHistory: any[]) => {
    setIsUpdatingAudience(true);
    try {
      const data = await api.aiExtractInsights({ messages: chatHistory, leadId: activeChatId! });
      if (data && !data.error) {
        updateActiveChat({ insights: data });
      } else {
        console.warn("AI didn't return valid insights", data);
      }
    } catch (error) {
      console.error("Error updating audience (gracefully handled):", error);
      // We don't want an AI failure to break the chat app, so we just log it and move on.
    } finally {
      setIsUpdatingAudience(false);
    }
  };

  const getStatusColor = (status: ChatStatus) => {
    switch (status) {
      case 'Nuevo': return 'bg-blue-100 text-blue-700';
      case 'Calificado': return 'bg-amber-100 text-amber-700';
      case 'En Negociación': return 'bg-purple-100 text-purple-700';
      case 'Cerrado Ganado': return 'bg-emerald-100 text-emerald-700';
      case 'Cerrado Perdido': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  // Demo Simulator Functions
  const handleNewLead = async (channel: string = "WhatsApp") => {
    try {
      const newChat = await api.createLead({
        name: "Lead Demo " + Math.floor(Math.random() * 1000),
        company: "Empresa Local",
        channel: channel,
        status: "Nuevo",
        score: Math.floor(Math.random() * 40) + 10,
        tags: ["Demo"],
        messages: []
      });

      setChats([newChat, ...chats]);
      setActiveChatId(newChat.id);

      await api.createNotification({
        type: 'lead',
        title: 'Nuevo Lead',
        message: `${newChat.name} ha iniciado una conversación por ${channel}.`
      });
    } catch (err) {
      console.error('Error creating lead:', err);
    }
  };

  const handleDeleteChat = async (id: number) => {
    try {
      await api.deleteLead(id);
      const updatedChats = chats.filter((c: any) => c.id !== id);
      setChats(updatedChats);
      if (activeChatId === id) {
        setActiveChatId(updatedChats[0]?.id || null);
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  const simulateLeadReply = async () => {
    if (!activeChat) return;
    const replies = [
      "Me parece interesante, ¿cuál es el siguiente paso?",
      "¿Tienen algún descuento si pago el año completo?",
      "Perfecto, envíame la propuesta por correo.",
      "Tengo una duda sobre el soporte, ¿es 24/7?"
    ];
    const randomReply = replies[Math.floor(Math.random() * replies.length)];

    const userMsg = { role: 'user', content: randomReply };
    const newMessages = [...activeChat.messages, userMsg];
    updateActiveChat({ messages: newMessages });

    // Persist simulated user message to backend
    try {
      await api.addMessage(activeChatId!, { role: 'user', content: randomReply });
    } catch (err) {
      console.error('Error saving simulated message:', err);
    }

    // Trigger AI response automatically or update insights if in human mode
    setTimeout(() => {
      if (!activeChat.humanMode) {
        triggerAIResponse(newMessages);
      } else {
        extractAudienceInsights(newMessages);
      }
    }, 500);
  };

  const triggerAIResponse = async (currentMessages: any[]) => {
    if (activeChat?.humanMode) return;
    setIsTyping(true);
    try {
      const response = await api.aiChat({
        leadId: activeChatId!,
        messages: currentMessages,
        knowledgeBase
      });

      const parts: string[] = response.parts?.length ? response.parts : [response.content || "Error al generar respuesta."];

      setLastDebugInfo({
        estado: response.newStatus || 'Nuevo',
        parts,
        contextLength: currentMessages.length,
        kbPreview: knowledgeBase ? knowledgeBase.substring(0, 300) + (knowledgeBase.length > 300 ? '…' : '') : '(vacía)',
      });

      let updatedMessages = [...currentMessages];

      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          setIsTyping(true);
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
        }
        setIsTyping(false);
        const aiMsg = { role: 'assistant', content: parts[i] };
        updatedMessages = [...updatedMessages, aiMsg];
        updateActiveChat({ messages: [...updatedMessages] });
      }

      let statusUpdates: any = {};
      if (response.saleDetected || response.newStatus === 'Cerrado Ganado') {
        statusUpdates = { status: 'Cerrado Ganado', score: 100 };
        setSaleToast(`¡Venta cerrada con ${activeChat?.name}! 🎉`);
        setTimeout(() => setSaleToast(null), 6000);
        addNotification({
          type: 'success',
          title: '🎉 ¡Venta Cerrada por IA!',
          message: `El agente cerró automáticamente la venta con ${activeChat?.name}.`
        });
      } else if (response.newStatus && response.newStatus !== 'Nuevo') {
        statusUpdates = { status: response.newStatus };
      } else if (response.humanRequested) {
        statusUpdates = { humanMode: true };
      }

      if (Object.keys(statusUpdates).length > 0) updateActiveChat(statusUpdates);
      extractAudienceInsights(updatedMessages);
    } catch (error) {
      console.error("Error generating response:", error);
      setIsTyping(false);
      updateActiveChat({ messages: [...currentMessages, { role: 'assistant', content: "Hubo un error de conexión con el agente." }] });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChat) return;

    const content = inputValue;
    setInputValue("");

    // Always send as operator to WhatsApp (and save to DB)
    const newMsg = { role: 'assistant', content, source: 'human' };
    const newMessages = [...activeChat.messages, newMsg];
    updateActiveChat({ messages: newMessages });

    try {
      await api.sendWhatsappOperatorMessage(activeChatId!, content);
    } catch {
      try { await api.addMessage(activeChatId!, { role: 'assistant', content, source: 'human' } as any); } catch {}
    }

  };

  const toggleHumanMode = () => {
    const newMode = !activeChat.humanMode;
    updateActiveChat({ humanMode: newMode });
    if (newMode) {
      addNotification({
        type: 'alert',
        title: 'Modo Humano Activado',
        message: `Has tomado el control de la conversación con ${activeChat.name}.`
      });
    }
  };

  const [showNewLeadMenu, setShowNewLeadMenu] = useState(false);
  const newLeadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (newLeadRef.current && !newLeadRef.current.contains(event.target as Node)) {
        setShowNewLeadMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredChats = chats.filter((chat: any) => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "Todos" || chat.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!activeChat && chats.length === 0) {
    return (
      <div
        className={cn(
          "h-[calc(100vh-8rem)] flex items-center justify-center rounded-xl border",
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}
      >
        <div className="text-center">
          <MessageSquare className={cn("w-12 h-12 mx-auto mb-4", darkMode ? "text-slate-600" : "text-slate-300")} />
          <h2 className={cn("text-lg font-bold mb-2", darkMode ? "text-white" : "text-slate-900")}>No hay leads</h2>
          <p className={cn("mb-6", darkMode ? "text-slate-400" : "text-slate-500")}>
            Agrega un nuevo lead para comenzar a probar el agente.
          </p>
          <div className="relative inline-block" ref={newLeadRef}>
            <button
              onClick={() => setShowNewLeadMenu(!showNewLeadMenu)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" /> Nuevo Lead
            </button>
            {showNewLeadMenu && (
              <div
                className={cn(
                  "absolute top-full mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-50 left-1/2 -translate-x-1/2",
                  darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                )}
              >
                <div className={cn("p-2 text-xs font-semibold border-b", darkMode ? "text-slate-400 bg-slate-800 border-slate-700" : "text-slate-500 bg-slate-50 border-slate-100")}>
                  Seleccionar Canal
                </div>
                <button onClick={() => { handleNewLead("WhatsApp"); setShowNewLeadMenu(false); }} className={cn("w-full text-left px-4 py-2 text-sm transition-colors", darkMode ? "text-slate-200 hover:bg-slate-800" : "hover:bg-slate-50")}>WhatsApp</button>
                <button onClick={() => { handleNewLead("Instagram"); setShowNewLeadMenu(false); }} className={cn("w-full text-left px-4 py-2 text-sm transition-colors", darkMode ? "text-slate-200 hover:bg-slate-800" : "hover:bg-slate-50")}>Instagram</button>
                <button onClick={() => { handleNewLead("Web Chat"); setShowNewLeadMenu(false); }} className={cn("w-full text-left px-4 py-2 text-sm transition-colors", darkMode ? "text-slate-200 hover:bg-slate-800" : "hover:bg-slate-50")}>Web Chat</button>
                <button onClick={() => { handleNewLead("LinkedIn"); setShowNewLeadMenu(false); }} className={cn("w-full text-left px-4 py-2 text-sm transition-colors", darkMode ? "text-slate-200 hover:bg-slate-800" : "hover:bg-slate-50")}>LinkedIn</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!activeChat) return null;

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 relative">

      {/* Left Panel: Chat List */}
      <div
        className={cn(
          "w-80 rounded-xl border shadow-sm flex flex-col overflow-hidden shrink-0",
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}
      >
        <div className={cn("p-4 border-b", darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50")}>
          <div className="flex justify-between items-center mb-3">
            <h2 className={cn("font-bold", darkMode ? "text-white" : "text-slate-900")}>Bandeja de Leads</h2>
            <div className="flex gap-1">
              <div className="relative" ref={newLeadRef}>
                <button
                  onClick={() => setShowNewLeadMenu(!showNewLeadMenu)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    darkMode ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  )}
                  title="Agregar Nuevo Lead"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {showNewLeadMenu && (
                  <div
                    className={cn(
                      "absolute top-full right-0 mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-50",
                      darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                    )}
                  >
                    <div className={cn("p-2 text-xs font-semibold border-b", darkMode ? "text-slate-400 bg-slate-800 border-slate-700" : "text-slate-500 bg-slate-50 border-slate-100")}>Seleccionar Canal</div>
                    <button onClick={() => { handleNewLead("WhatsApp"); setShowNewLeadMenu(false); }} className={cn("w-full text-left px-4 py-2 text-sm transition-colors", darkMode ? "text-slate-200 hover:bg-slate-800" : "hover:bg-slate-50")}>WhatsApp</button>
                    <button onClick={() => { handleNewLead("Instagram"); setShowNewLeadMenu(false); }} className={cn("w-full text-left px-4 py-2 text-sm transition-colors", darkMode ? "text-slate-200 hover:bg-slate-800" : "hover:bg-slate-50")}>Instagram</button>
                    <button onClick={() => { handleNewLead("Web Chat"); setShowNewLeadMenu(false); }} className={cn("w-full text-left px-4 py-2 text-sm transition-colors", darkMode ? "text-slate-200 hover:bg-slate-800" : "hover:bg-slate-50")}>Web Chat</button>
                    <button onClick={() => { handleNewLead("LinkedIn"); setShowNewLeadMenu(false); }} className={cn("w-full text-left px-4 py-2 text-sm transition-colors", darkMode ? "text-slate-200 hover:bg-slate-800" : "hover:bg-slate-50")}>LinkedIn</button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className={cn("w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2", darkMode ? "text-slate-500" : "text-slate-400")} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar lead o empresa..."
                className={cn(
                  "w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none transition-all",
                  darkMode
                    ? "bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                )}
              />
            </div>
            <div className="relative" ref={filterMenuRef}>
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={cn(
                  "p-2 border rounded-lg transition-colors flex items-center justify-center",
                  statusFilter !== "Todos"
                    ? darkMode
                      ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                      : "bg-indigo-50 border-indigo-200 text-indigo-700"
                    : darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
                title="Filtrar por estado"
              >
                <Filter className="w-4 h-4" />
              </button>
              {showFilterMenu && (
                <div
                  className={cn(
                    "absolute top-full right-0 mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-50",
                    darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                  )}
                >
                  <div className={cn("p-2 text-xs font-semibold border-b", darkMode ? "text-slate-400 bg-slate-800 border-slate-700" : "text-slate-500 bg-slate-50 border-slate-100")}>
                    Filtrar por Estado
                  </div>
                  {['Todos', 'Nuevo', 'Calificado', 'En Negociación', 'Cerrado Ganado', 'Cerrado Perdido'].map(status => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setShowFilterMenu(false); }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between",
                        statusFilter === status
                          ? darkMode
                            ? "bg-indigo-500/10 text-indigo-300 font-medium"
                            : "bg-indigo-50 text-indigo-700 font-medium"
                          : darkMode
                            ? "hover:bg-slate-800 text-slate-200"
                            : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      {status}
                      {statusFilter === status && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className={cn("p-6 text-center text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>
              No se encontraron chats que coincidan con los filtros.
            </div>
          ) : (
            filteredChats.map((chat: any) => (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={cn(
                  "p-4 border-b cursor-pointer transition-colors border-l-4",
                  darkMode ? "border-b-slate-800" : "border-b-slate-100",
                  activeChatId === chat.id
                    ? darkMode
                      ? "bg-indigo-500/10 border-l-indigo-500"
                      : "bg-indigo-50 border-l-indigo-600"
                    : darkMode
                      ? "hover:bg-slate-800 border-l-transparent"
                      : "hover:bg-slate-50 border-l-transparent"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className={cn("font-semibold text-sm truncate pr-2", darkMode ? "text-white" : "text-slate-900")}>{chat.name}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${getStatusColor(chat.status)}`}>
                    {chat.status}
                  </span>
                </div>
                <p className={cn("text-xs mb-2", darkMode ? "text-slate-400" : "text-slate-500")}>{chat.company} • {chat.channel}</p>
                <p className={cn("text-sm truncate", darkMode ? "text-slate-300" : "text-slate-600")}>
                  {chat.messages[chat.messages.length - 1]?.content || "..."}
                </p>
              </div>
            )))}
        </div>
      </div>

      {/* Middle Panel: Chat Interface */}
      <div
        className={cn(
          "flex-1 rounded-xl border shadow-sm flex flex-col overflow-hidden",
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}
      >
        {/* Chat Header */}
        <div className={cn("px-6 py-4 border-b flex justify-between items-center shrink-0", darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50")}>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold", darkMode ? "bg-indigo-500/15 text-indigo-300" : "bg-indigo-100 text-indigo-600")}>
              {activeChat.name.charAt(0)}
            </div>
            <div>
              <h2 className={cn("font-semibold flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
                {activeChat.name}
                <span className={cn("text-xs font-normal px-2 py-0.5 rounded-full", darkMode ? "text-slate-300 bg-slate-700" : "text-slate-500 bg-slate-200")}>Score: {activeChat.score}</span>
              </h2>
              <p className={cn("text-xs font-medium flex items-center gap-1 mt-0.5", darkMode ? "text-slate-400" : "text-slate-500")}>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> En línea ({activeChat.channel})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={simulateLeadReply}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                darkMode ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              )}
              title="Simular que el lead responde"
            >
              <MessageCircle className="w-4 h-4" /> Simular Lead
            </button>
            <button
              onClick={toggleHumanMode}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                activeChat.humanMode
                  ? darkMode
                    ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                  : darkMode
                    ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                    : "bg-indigo-50 text-indigo-700 border-indigo-100"
              )}
            >
              {activeChat.humanMode ? <><Bot className="w-4 h-4" /> Activar IA</> : <><Bot className="w-4 h-4" /> IA Activa</>}
            </button>
            <button
              onClick={() => handleDeleteChat(activeChat.id)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                darkMode ? "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" : "text-rose-400 hover:text-rose-600 hover:bg-rose-50"
              )}
              title="Borrar Chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className={cn("flex-1 overflow-y-auto p-6 space-y-4", darkMode ? "bg-slate-950/40" : "bg-slate-50/50")}>
          {activeChat.messages.map((msg: any, idx: number) => {
            const isHuman = msg.source === 'human';
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';
            return (
            <div key={idx} className={`flex ${isUser || isHuman ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'}`}>
              {isSystem ? (
                <div className={cn("text-xs px-3 py-1 rounded-full font-medium", darkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-500")}>
                  {msg.content}
                </div>
              ) : (
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : isHuman
                      ? darkMode ? 'bg-amber-500/20 border border-amber-500/30 text-amber-100 rounded-tr-none' : 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tr-none'
                      : darkMode
                        ? 'bg-slate-900 border border-slate-700 text-slate-200 rounded-tl-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}>
                  {!isUser && !isHuman && (
                    <div className={cn("flex items-center gap-1.5 mb-1", darkMode ? "text-indigo-300" : "text-indigo-600")}>
                      <Bot className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{agentName}</span>
                    </div>
                  )}
                  {isHuman && (
                    <div className={cn("flex items-center gap-1.5 mb-1", darkMode ? "text-amber-400" : "text-amber-600")}>
                      <User className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Tú</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              )}
            </div>
            );
          })}
          {isTyping && (
            <div className="flex justify-start">
              <div className={cn("rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2 border", darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200")}>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className={cn("p-4 border-t shrink-0", darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white")}>
          {activeChat.status === 'Cerrado Ganado' ? (
            <div className={cn("flex items-center justify-center gap-3 py-3 px-4 rounded-xl border font-medium text-sm", darkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              ¡Venta cerrada! Esta conversación ha sido ganada exitosamente.
            </div>
          ) : activeChat.status === 'Cerrado Perdido' ? (
            <div className={cn("flex items-center justify-center gap-3 py-3 px-4 rounded-xl border font-medium text-sm", darkMode ? "bg-rose-500/10 border-rose-500/20 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-700")}>
              <X className="w-5 h-5 shrink-0" />
              Esta conversación fue cerrada como perdida.
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Escribe un mensaje para enviar al contacto..."
                className={cn(
                  "flex-1 px-4 py-2.5 border rounded-xl text-sm transition-all outline-none",
                  darkMode
                    ? "bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:bg-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    : "bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                )}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className={`p-2.5 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm ${activeChat.humanMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Right Panel: AI Settings & Audience */}
      <div className="w-[350px] flex flex-col gap-4 shrink-0">

        {/* Tabs */}
        <div className={cn("flex p-1 rounded-xl shrink-0", darkMode ? "bg-slate-800" : "bg-slate-200")}>
          <button
            onClick={() => setActiveTab('lead')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all",
              activeTab === 'lead'
                ? darkMode
                  ? "bg-slate-900 text-indigo-300 shadow-sm"
                  : "bg-white text-indigo-700 shadow-sm"
                : darkMode
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
            )}
          >
            <User className="w-4 h-4" /> Lead
          </button>
          <button
            onClick={() => setActiveTab('audience')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all",
              activeTab === 'audience'
                ? darkMode
                  ? "bg-slate-900 text-indigo-300 shadow-sm"
                  : "bg-white text-indigo-700 shadow-sm"
                : darkMode
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Target className="w-4 h-4" /> Sellia
          </button>
          <button
            onClick={() => setActiveTab('debug')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all",
              activeTab === 'debug'
                ? darkMode
                  ? "bg-slate-900 text-amber-300 shadow-sm"
                  : "bg-white text-amber-700 shadow-sm"
                : darkMode
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
            )}
          >
            <BrainCircuit className="w-4 h-4" /> Debug Sellia
          </button>
        </div>

        {/* Tab Content: Lead Info */}
        {activeTab === 'lead' && (
          <div
            className={cn(
              "flex-1 rounded-xl border shadow-sm flex flex-col overflow-hidden",
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            )}
          >
            <div className={cn("p-5 border-b", darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50")}>
              <h3 className={cn("font-semibold flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
                <User className="w-5 h-5 text-indigo-600" /> Perfil del Lead
              </h3>
            </div>
            <div className="p-5 flex-1 overflow-y-auto space-y-6">

              {/* Status Management */}
              <div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>Estado del Lead</h4>
                <div className="grid grid-cols-1 gap-2">
                  {['Nuevo', 'Calificado', 'En Negociación', 'Cerrado Ganado', 'Cerrado Perdido'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status as ChatStatus)}
                      className={cn(
                        "py-2 px-3 text-xs font-medium rounded-lg border text-left flex items-center justify-between transition-colors",
                        activeChat.status === status
                          ? darkMode
                            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                            : "bg-indigo-50 border-indigo-200 text-indigo-700"
                          : darkMode
                            ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {status}
                      {activeChat.status === status && <Check className="w-3 h-3" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1", darkMode ? "text-slate-500" : "text-slate-400")}>
                  <Tag className="w-3 h-3" /> Etiquetas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeChat.tags.map((tag: string, i: number) => (
                    <span key={i} className={cn("px-2.5 py-1 border rounded-md text-xs font-medium flex items-center gap-1", darkMode ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200")}>
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-rose-500 transition-colors"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                  {!showTagInput ? (
                    <button
                      onClick={() => setShowTagInput(true)}
                      className={cn("px-2.5 py-1 border rounded-md text-xs font-medium transition-colors", darkMode ? "bg-slate-900 border-dashed border-slate-600 text-slate-400 hover:bg-slate-800 hover:border-slate-500" : "bg-white border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 hover:border-slate-400")}
                    >
                      + Añadir
                    </button>
                  ) : (
                    <form onSubmit={handleAddTag} className="flex gap-1">
                      <input
                        autoFocus
                        value={newTagInput}
                        onChange={e => setNewTagInput(e.target.value)}
                        onKeyDown={e => e.key === 'Escape' && setShowTagInput(false)}
                        placeholder="Nueva etiqueta…"
                        className={cn("px-2 py-1 border rounded-md text-xs outline-none w-28", darkMode ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-300 focus:border-indigo-500")}
                      />
                      <button type="submit" className="px-2 py-1 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700">OK</button>
                      <button type="button" onClick={() => setShowTagInput(false)} className={cn("px-2 py-1 rounded-md text-xs", darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100")}>✕</button>
                    </form>
                  )}
                </div>
              </div>

              {/* Score editing */}
              <div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>Score del Lead (0–100)</h4>
                {editingScore ? (
                  <div className="flex gap-2">
                    <input
                      type="number" min={0} max={100}
                      value={scoreInput}
                      onChange={e => setScoreInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveScore(); if (e.key === 'Escape') setEditingScore(false); }}
                      autoFocus
                      className={cn("w-24 px-2 py-1 border rounded-lg text-sm outline-none", darkMode ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-300 focus:border-indigo-500")}
                    />
                    <button onClick={handleSaveScore} className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">Guardar</button>
                    <button onClick={() => setEditingScore(false)} className={cn("px-2 py-1 rounded-lg text-xs font-medium", darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100")}>Cancelar</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={cn("flex-1 rounded-full h-2", darkMode ? "bg-slate-700" : "bg-slate-200")}>
                      <div className={`h-2 rounded-full transition-all ${activeChat.score > 70 ? 'bg-emerald-500' : activeChat.score > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${activeChat.score}%` }} />
                    </div>
                    <span className={cn("text-sm font-bold w-8 text-right", darkMode ? "text-white" : "text-slate-900")}>{activeChat.score}</span>
                    <button onClick={() => { setScoreInput(String(activeChat.score)); setEditingScore(true); }} className={cn("text-xs underline", darkMode ? "text-indigo-400" : "text-indigo-600")}>Editar</button>
                  </div>
                )}
              </div>

              {/* Name & Company editing */}
              <div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>Nombre</h4>
                {editingName ? (
                  <div className="flex gap-2">
                    <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }} autoFocus className={cn("flex-1 px-2 py-1 border rounded-lg text-sm outline-none", darkMode ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-300 focus:border-indigo-500")} />
                    <button onClick={handleSaveName} className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">Guardar</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", darkMode ? "text-slate-200" : "text-slate-800")}>{activeChat.name}</span>
                    <button onClick={() => { setNameInput(activeChat.name); setEditingName(true); }} className={cn("text-xs underline", darkMode ? "text-indigo-400" : "text-indigo-600")}>Editar</button>
                  </div>
                )}
              </div>

              <div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>Empresa</h4>
                {editingCompany ? (
                  <div className="flex gap-2">
                    <input value={companyInput} onChange={e => setCompanyInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveCompany(); if (e.key === 'Escape') setEditingCompany(false); }} autoFocus className={cn("flex-1 px-2 py-1 border rounded-lg text-sm outline-none", darkMode ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-300 focus:border-indigo-500")} />
                    <button onClick={handleSaveCompany} className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">Guardar</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", darkMode ? "text-slate-200" : "text-slate-800")}>{activeChat.company || '—'}</span>
                    <button onClick={() => { setCompanyInput(activeChat.company || ''); setEditingCompany(true); }} className={cn("text-xs underline", darkMode ? "text-indigo-400" : "text-indigo-600")}>Editar</button>
                  </div>
                )}
              </div>

              <div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>
                  Email del cliente {activeChat.email && <span className="ml-1 text-emerald-500 normal-case font-normal">✓</span>}
                </h4>
                {editingEmail ? (
                  <div className="flex gap-2">
                    <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveEmail(); if (e.key === 'Escape') setEditingEmail(false); }} autoFocus placeholder="correo@ejemplo.com" className={cn("flex-1 px-2 py-1 border rounded-lg text-sm outline-none", darkMode ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500" : "bg-white border-slate-300 focus:border-indigo-500")} />
                    <button onClick={handleSaveEmail} className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">Guardar</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", darkMode ? "text-slate-200" : "text-slate-800")}>{activeChat.email || <span className={cn("italic text-xs", darkMode ? "text-slate-500" : "text-slate-400")}>Sin email — la IA lo pedirá</span>}</span>
                    <button onClick={() => { setEmailInput(activeChat.email || ''); setEditingEmail(true); }} className={cn("text-xs underline", darkMode ? "text-indigo-400" : "text-indigo-600")}>Editar</button>
                  </div>
                )}
              </div>

              {/* Needs (from AI) */}
              <div>
                <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>Lo que busca (IA)</h4>
                {(activeChat.insights?.needs || []).length === 0 ? (
                  <p className={cn("text-xs italic", darkMode ? "text-slate-500" : "text-slate-400")}>Sin datos aún. Inicia una conversación para extraer insights.</p>
                ) : (
                  <ul className="space-y-2">
                    {(activeChat.insights?.needs || []).map((need: string, i: number) => (
                      <li key={i} className={cn("text-sm flex items-start gap-2", darkMode ? "text-slate-300" : "text-slate-700")}>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                        {need}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Tab Content: Audience & Growth */}
        {activeTab === 'audience' && (
          <div
            className={cn(
              "flex-1 rounded-xl border shadow-sm flex flex-col overflow-hidden",
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            )}
          >
            <div className={cn("p-5 border-b flex justify-between items-start", darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50")}>
              <div>
                <h3 className={cn("font-semibold flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
                  <Sparkles className="w-5 h-5 text-amber-500" /> Asistente de Sellia
                </h3>
                <p className={cn("text-xs mt-1", darkMode ? "text-slate-400" : "text-slate-500")}>Insights en tiempo real para tu negocio.</p>
              </div>
              {isUpdatingAudience && (
                <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-6">

              {/* Growth Insights */}
              {!activeChat.insights ? (
                <div className={cn("p-4 rounded-xl border text-center", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                  <Sparkles className={cn("w-8 h-8 mx-auto mb-2", darkMode ? "text-slate-600" : "text-slate-300")} />
                  <p className={cn("text-sm font-medium", darkMode ? "text-slate-400" : "text-slate-500")}>Sin insights aún</p>
                  <p className={cn("text-xs mt-1", darkMode ? "text-slate-500" : "text-slate-400")}>El agente IA generará datos de audiencia tras las primeras conversaciones.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>Oportunidades Detectadas</h4>
                    {(activeChat.insights.opportunities || []).length === 0 ? (
                      <p className={cn("text-xs italic", darkMode ? "text-slate-500" : "text-slate-400")}>Sin oportunidades detectadas aún.</p>
                    ) : (
                      <ul className="space-y-2">
                        {(activeChat.insights.opportunities || []).map((opp: string, i: number) => (
                          <li key={i} className={cn("flex items-start gap-2 text-sm p-2 rounded-lg border", darkMode ? "text-slate-200 bg-emerald-500/10 border-emerald-500/20" : "text-slate-700 bg-emerald-50/50 border-emerald-100")}>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{opp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>Puntos de Dolor</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {(activeChat.insights.painPoints || []).length === 0 ? (
                          <span className={cn("text-xs italic", darkMode ? "text-slate-500" : "text-slate-400")}>—</span>
                        ) : (activeChat.insights.painPoints || []).map((point: string, i: number) => (
                          <span key={i} className={cn("px-2 py-1 border rounded text-[11px] font-medium", darkMode ? "bg-rose-500/10 text-rose-300 border-rose-500/20" : "bg-rose-50 text-rose-700 border-rose-100")}>
                            {point}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>Intención</h4>
                      {activeChat.insights.buyingIntent ? (
                        <span className={`px-2 py-1 rounded text-[11px] font-medium ${activeChat.insights.buyingIntent === 'Alta' ? 'bg-emerald-100 text-emerald-700' : activeChat.insights.buyingIntent === 'Media' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                          {activeChat.insights.buyingIntent}
                        </span>
                      ) : <span className={cn("text-xs", darkMode ? "text-slate-500" : "text-slate-400")}>—</span>}
                    </div>
                  </div>
                </div>
              )}

              <div className={cn("h-px w-full", darkMode ? "bg-slate-800" : "bg-slate-200")}></div>

              {/* Lookalike Parameters */}
              <div>
                <h4 className={cn("text-sm font-bold mb-3 flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
                  <Target className="w-4 h-4 text-indigo-600" /> Parámetros Lookalike
                </h4>

                <div className="space-y-3">
                  <div className={cn("border rounded-lg p-3", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                    <div className={cn("text-xs font-bold mb-1", darkMode ? "text-slate-400" : "text-slate-500")}>Meta Ads (Facebook/Instagram)</div>
                    <div className={cn("text-sm font-medium", darkMode ? "text-slate-200" : "text-slate-800")}>{activeChat.insights?.platformParams?.meta || '—'}</div>
                  </div>
                  <div className={cn("border rounded-lg p-3", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                    <div className={cn("text-xs font-bold mb-1", darkMode ? "text-slate-400" : "text-slate-500")}>Google Ads</div>
                    <div className={cn("text-sm font-medium", darkMode ? "text-slate-200" : "text-slate-800")}>{activeChat.insights?.platformParams?.google || '—'}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab Content: IA Debug */}
        {activeTab === 'debug' && (
          <div className={cn("flex-1 rounded-xl border shadow-sm flex flex-col overflow-hidden", darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200")}>
            <div className={cn("p-5 border-b", darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50")}>
              <h3 className={cn("font-semibold flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
                <BrainCircuit className="w-5 h-5 text-amber-500" /> Debug IA
              </h3>
              <p className={cn("text-xs mt-1", darkMode ? "text-slate-400" : "text-slate-500")}>Última respuesta del agente en detalle.</p>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {!lastDebugInfo ? (
                <div className={cn("p-4 rounded-xl border text-center", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200")}>
                  <p className={cn("text-sm", darkMode ? "text-slate-400" : "text-slate-500")}>Sin datos aún. Envía un mensaje para ver el debug.</p>
                </div>
              ) : (
                <>
                  {/* Estado */}
                  <div>
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", darkMode ? "text-slate-500" : "text-slate-400")}>Estado detectado</p>
                    <span className={cn("inline-block px-3 py-1 rounded-full text-xs font-bold",
                      lastDebugInfo.estado === 'Cerrado Ganado' ? 'bg-emerald-100 text-emerald-700' :
                        lastDebugInfo.estado === 'En Negociación' ? 'bg-amber-100 text-amber-700' :
                          lastDebugInfo.estado === 'Calificado' ? 'bg-blue-100 text-blue-700' :
                            lastDebugInfo.estado === 'Cerrado Perdido' ? 'bg-rose-100 text-rose-700' :
                              darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                    )}>
                      {lastDebugInfo.estado}
                    </span>
                  </div>

                  {/* Contexto */}
                  <div>
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", darkMode ? "text-slate-500" : "text-slate-400")}>Contexto enviado</p>
                    <p className={cn("text-xs", darkMode ? "text-slate-300" : "text-slate-700")}>
                      {lastDebugInfo.contextLength} mensaje{lastDebugInfo.contextLength !== 1 ? 's' : ''} en el historial
                    </p>
                  </div>

                  {/* Partes */}
                  <div>
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", darkMode ? "text-slate-500" : "text-slate-400")}>
                      Partes generadas ({lastDebugInfo.parts.length})
                    </p>
                    <div className="space-y-2">
                      {lastDebugInfo.parts.map((part, i) => (
                        <div key={i} className={cn("p-2 rounded-lg border text-xs", darkMode ? "bg-slate-800 border-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                          <span className={cn("text-[10px] font-bold mr-1", darkMode ? "text-amber-400" : "text-amber-600")}>#{i + 1}</span>
                          {part}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* KB Preview */}
                  <div>
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", darkMode ? "text-slate-500" : "text-slate-400")}>Base de conocimientos (preview)</p>
                    <pre className={cn("text-[10px] p-2 rounded-lg border whitespace-pre-wrap leading-relaxed", darkMode ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500")}>
                      {lastDebugInfo.kbPreview}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Sale Closed Toast */}
      {saleToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl border bg-emerald-600 border-emerald-500 text-white text-sm font-semibold flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {saleToast}
        </div>
      )}

    </div>
  );
}