import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeft, Save, Play, Settings, Undo2, Redo2, X, Send, Bot, User, UserPlus, Loader2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

import { TriggerNode, ActionNode, ConditionNode, IntegrationNode } from '../components/FlowBuilder/CustomNodes';
import Sidebar from '../components/FlowBuilder/Sidebar';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  integration: IntegrationNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: { label: 'Mensaje de WhatsApp', description: 'Inicia cuando llega un mensaje', icon: 'message' },
  },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

export default function FlowBuilder() {
  const [searchParams] = useSearchParams();
  const automationId = searchParams.get('id');

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showEmulator, setShowEmulator] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [emulatorMessages, setEmulatorMessages] = useState<{ role: 'bot' | 'user', text: string }[]>([
    { role: 'bot', text: '¡Hola! Soy el asistente virtual. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [emulatorInput, setEmulatorInput] = useState('');
  const [automationName, setAutomationName] = useState('Nueva Automatización');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [leadSaveToast, setLeadSaveToast] = useState<string | null>(null);

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

  // Load existing automation if id param is present
  useEffect(() => {
    if (!automationId) return;
    api.getAutomations().then((automations) => {
      const found = automations.find((a: any) => String(a.id) === automationId);
      if (found) {
        setAutomationName(found.name);
        if (found.flow_data) {
          try {
            const fd = typeof found.flow_data === 'string' ? JSON.parse(found.flow_data) : found.flow_data;
            if (fd.nodes) setNodes(fd.nodes);
            if (fd.edges) setEdges(fd.edges);
          } catch (_) { /* ignore parse error */ }
        }
      }
    }).catch(console.error);
  }, [automationId, setNodes, setEdges]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const flow_data = { nodes, edges };
      if (automationId) {
        await api.updateAutomation(Number(automationId), { name: automationName, flow_data });
      } else {
        const created = await api.createAutomation({ name: automationName, status: 'Activo', flow_data });
        // Update URL to reflect new id without re-mounting
        window.history.replaceState(null, '', `/flows/builder?id=${created.id}`);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      console.error('Error saving automation:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  // Extract AI prompt from the first bot action node in the flow
  const getFlowAiPrompt = (): string => {
    const botNode = nodes.find(n => n.type === 'action' && n.data.icon === 'bot');
    return (botNode?.data?.prompt as string) || 'Eres un asistente de ventas profesional. Califica al lead, responde preguntas y guía hacia el cierre de venta.';
  };

  const handleSendEmulatorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emulatorInput.trim() || isAiTyping) return;

    const userText = emulatorInput;
    setEmulatorMessages(prev => [...prev, { role: 'user', text: userText }]);
    setEmulatorInput('');
    setIsAiTyping(true);

    try {
      const history = emulatorMessages
        .filter(m => m.role !== 'bot' || emulatorMessages.indexOf(m) > 0)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      history.push({ role: 'user', content: userText });

      // Use the flow's AI node prompt as knowledge base context
      const flowPrompt = getFlowAiPrompt();
      const response = await api.aiChat({ messages: history, knowledgeBase: flowPrompt });
      setEmulatorMessages(prev => [...prev, { role: 'bot', text: response.content || 'Sin respuesta.' }]);
    } catch (_) {
      setEmulatorMessages(prev => [...prev, { role: 'bot', text: 'Error al conectar con el agente IA.' }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSaveAsLead = async () => {
    if (isSavingLead || emulatorMessages.length <= 1) return;
    setIsSavingLead(true);
    try {
      const messages = emulatorMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text
      }));
      await api.createLead({
        name: `Lead desde Flujo: ${automationName}`,
        company: '',
        channel: 'Automatización',
        status: 'Nuevo',
        score: 0,
        tags: ['automatización', 'emulador'],
        messages
      });
      setLeadSaveToast('✓ Lead creado exitosamente desde el emulador');
      setTimeout(() => setLeadSaveToast(null), 3000);
    } catch (err) {
      setLeadSaveToast('✕ Error al crear el lead');
      setTimeout(() => setLeadSaveToast(null), 3000);
    } finally {
      setIsSavingLead(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection | Edge) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: '#4f46e5', strokeWidth: 2 } } as any, eds)
      ),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/label');
      const description = event.dataTransfer.getData('application/description');
      const icon = event.dataTransfer.getData('application/icon');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: { label, description, icon },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className={cn("h-screen flex flex-col", darkMode ? "bg-slate-950" : "bg-slate-50")}>
      {/* Header */}
      <header
        className={cn(
          "h-16 border-b flex items-center justify-between px-6 shrink-0 z-10",
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        )}
      >
        <div className="flex items-center gap-4">
          <Link
            to="/flows"
            className={cn(
              "p-2 rounded-lg transition-colors",
              darkMode
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            )}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <input
                value={automationName}
                onChange={(e) => setAutomationName(e.target.value)}
                className={cn(
                  "font-bold bg-transparent border-b outline-none focus:border-indigo-500 transition-colors",
                  darkMode ? "text-white border-slate-700" : "text-slate-900 border-slate-300"
                )}
              />
              {saveStatus === 'saved' && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Guardado ✓</span>
              )}
              {saveStatus === 'error' && (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">Error al guardar</span>
              )}
            </div>

          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-1 mr-4 pr-4 border-r", darkMode ? "border-slate-800" : "border-slate-200")}>
            <button
              className={cn(
                "p-2 rounded-lg transition-colors",
                darkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              className={cn(
                "p-2 rounded-lg transition-colors",
                darkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowEmulator(!showEmulator)}
            className={cn(
              "px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm",
              showEmulator
                ? darkMode
                  ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                  : "bg-indigo-50 border-indigo-200 text-indigo-700"
                : darkMode
                  ? "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            <Play className="w-4 h-4" /> {showEmulator ? 'Cerrar Emulador' : 'Probar Flujo'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar y Publicar'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <ReactFlowProvider>
          <Sidebar />

          <div className="flex-1 relative" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              className={cn(darkMode ? "bg-slate-950" : "bg-slate-50")}
            >
              <Background color={darkMode ? "#334155" : "#cbd5e1"} gap={16} />
              <Controls
                className={cn(
                  "border shadow-sm rounded-lg overflow-hidden",
                  darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"
                )}
              />
            </ReactFlow>
          </div>

          {/* Emulator Panel */}
          {showEmulator && (
            <div className={cn(
              "w-80 border-l flex flex-col h-full shadow-xl z-30 absolute right-0 top-0",
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            )}>
              <div className="p-4 border-b border-indigo-500/30 flex justify-between items-center bg-indigo-600 text-white">
                <h3 className="font-semibold flex items-center gap-2">
                  <Bot className="w-5 h-5" /> Emulador de Chat
                </h3>
                <button onClick={() => setShowEmulator(false)} className="text-indigo-200 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={cn("flex-1 p-4 overflow-y-auto space-y-4", darkMode ? "bg-slate-950/70" : "bg-slate-50")}>
                {emulatorMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'bot'
                      ? darkMode
                        ? 'bg-indigo-500/15 text-indigo-300'
                        : 'bg-indigo-100 text-indigo-600'
                      : darkMode
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-200 text-slate-600'
                      }`}>
                      {msg.role === 'bot' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className={`px-3 py-2 rounded-2xl max-w-[75%] text-sm ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : darkMode
                        ? 'bg-slate-900 border border-slate-700 text-slate-200 rounded-tl-sm shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                      }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex gap-2">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      darkMode ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                    )}>
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className={cn("px-4 py-3 rounded-2xl rounded-tl-sm",
                      darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm'
                    )}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={cn("p-3 border-t space-y-2", darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white")}>
                <form onSubmit={handleSendEmulatorMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={emulatorInput}
                    onChange={(e) => setEmulatorInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    disabled={isAiTyping}
                    className={cn(
                      "flex-1 px-3 py-2 border rounded-lg text-sm outline-none",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-slate-50 border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  />
                  <button
                    type="submit"
                    disabled={!emulatorInput.trim() || isAiTyping}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAiTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
                {emulatorMessages.length > 1 && (
                  <button
                    onClick={handleSaveAsLead}
                    disabled={isSavingLead}
                    className={cn(
                      "w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 border",
                      darkMode
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    )}
                  >
                    {isSavingLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {isSavingLead ? 'Guardando...' : 'Guardar como Lead'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Properties Panel */}
          {selectedNode && !showEmulator && (
            <div className={cn(
              "w-80 border-l flex flex-col h-full shadow-xl z-20 absolute right-0 top-0",
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            )}>
              <div className={cn("p-4 border-b flex justify-between items-center", darkMode ? "border-slate-800 bg-slate-800/70" : "border-slate-200 bg-slate-50")}>
                <h3 className={cn("font-semibold flex items-center gap-2", darkMode ? "text-white" : "text-slate-900")}>
                  <Settings className={cn("w-4 h-4", darkMode ? "text-slate-400" : "text-slate-500")} /> Configuración
                </h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className={cn("text-xl font-light", darkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600")}
                >
                  &times;
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                <div>
                  <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Nombre del Nodo</label>
                  <input
                    type="text"
                    value={selectedNode.data.label as string}
                    onChange={(e) => {
                      setNodes((nds) =>
                        nds.map((n) => {
                          if (n.id === selectedNode.id) {
                            n.data = { ...n.data, label: e.target.value };
                          }
                          return n;
                        })
                      );
                    }}
                    className={cn(
                      "w-full px-3 py-2 border rounded-lg text-sm outline-none shadow-sm",
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  />
                </div>

                {selectedNode.type === 'action' && selectedNode.data.icon === 'bot' && (
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Prompt de IA (Gemini 2.0 Flash)</label>
                    <textarea
                      rows={6}
                      value={(selectedNode.data.prompt as string) || 'Eres un asistente de ventas B2B. Tu objetivo es calificar al lead preguntando el tamaño de su empresa y su presupuesto anual. Sé amable y profesional.'}
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((n) => {
                            if (n.id === selectedNode.id) {
                              n.data = { ...n.data, prompt: e.target.value };
                            }
                            return n;
                          })
                        );
                      }}
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg text-sm outline-none shadow-sm resize-none",
                        darkMode
                          ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      )}
                    />
                    <p className={cn("text-xs mt-1.5", darkMode ? "text-slate-500" : "text-slate-400")}>
                      Este prompt se usará en el emulador y al ejecutar la automatización sobre leads.
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={cn("text-xs", darkMode ? "text-slate-400" : "text-slate-500")}>Modelo:</span>
                      <select className={cn(
                        "text-xs border rounded px-2 py-1",
                        darkMode ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-200 bg-slate-50"
                      )}>
                        <option>Gemini 2.0 Flash (Recomendado)</option>
                        <option>Gemini 2.0 Flash Lite (Rápido)</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'integration' && (
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Webhook URL (Make / n8n)</label>
                    <input
                      type="url"
                      placeholder="https://hook.make.com/..."
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg text-sm outline-none shadow-sm",
                        darkMode
                          ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      )}
                    />
                    <p className={cn("text-xs mt-2", darkMode ? "text-slate-400" : "text-slate-500")}>
                      Los datos del lead (nombre, teléfono, score) se enviarán como un payload JSON (POST) a esta URL.
                    </p>
                    <button className={cn(
                      "mt-4 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                      darkMode
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                    )}>
                      Probar Webhook
                    </button>
                  </div>
                )}

                {selectedNode.type === 'condition' && (
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", darkMode ? "text-slate-300" : "text-slate-700")}>Regla de Evaluación</label>
                    <div className="flex items-center gap-2 mb-2">
                      <select className={cn(
                        "flex-1 px-3 py-2 border rounded-lg text-sm outline-none shadow-sm",
                        darkMode
                          ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500"
                          : "bg-white border-slate-200 focus:border-indigo-500"
                      )}>
                        <option>Lead Score</option>
                        <option>Canal</option>
                        <option>Palabra Clave</option>
                      </select>
                      <select className={cn(
                        "flex-1 px-3 py-2 border rounded-lg text-sm outline-none shadow-sm",
                        darkMode
                          ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500"
                          : "bg-white border-slate-200 focus:border-indigo-500"
                      )}>
                        <option>Mayor que</option>
                        <option>Menor que</option>
                        <option>Igual a</option>
                      </select>
                    </div>
                    <input
                      type="number"
                      defaultValue="80"
                      className={cn(
                        "w-full px-3 py-2 border rounded-lg text-sm outline-none shadow-sm",
                        darkMode
                          ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          : "bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      )}
                    />
                  </div>
                )}

                <div className={cn("pt-6 border-t", darkMode ? "border-slate-800" : "border-slate-200")}>
                  <button
                    onClick={() => {
                      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                      setSelectedNode(null);
                    }}
                    className={cn(
                      "w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                      darkMode
                        ? "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/20"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
                    )}
                  >
                    Eliminar Nodo
                  </button>
                </div>
              </div>
            </div>
          )}
        </ReactFlowProvider>
      </div>

      {/* Lead Save Toast */}
      {leadSaveToast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl border text-sm font-medium flex items-center gap-3 transition-all",
          leadSaveToast.startsWith('✓')
            ? darkMode ? "bg-emerald-900 border-emerald-700 text-emerald-200" : "bg-emerald-50 border-emerald-200 text-emerald-800"
            : darkMode ? "bg-rose-900 border-rose-700 text-rose-200" : "bg-rose-50 border-rose-200 text-rose-800"
        )}>
          {leadSaveToast}
        </div>
      )}
    </div>
  );
}