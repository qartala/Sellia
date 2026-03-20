import { DragEvent, useEffect, useState } from 'react';
import { MessageSquare, Zap, GitBranch, Webhook, Bot, Mail, Database, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const nodeTypes = [
  {
    type: 'trigger',
    label: 'Mensaje Recibido',
    description: 'Inicia cuando llega un mensaje',
    icon: MessageSquare,
    iconName: 'message',
    color: 'emerald'
  },
  {
    type: 'action',
    label: 'Respuesta de IA',
    description: 'Genera respuesta con Gemini/Llama',
    icon: Bot,
    iconName: 'bot',
    color: 'indigo'
  },
  {
    type: 'condition',
    label: 'Calificación de Lead',
    description: 'Evalúa el score del lead',
    icon: GitBranch,
    iconName: 'branch',
    color: 'amber'
  },
  {
    type: 'integration',
    label: 'Webhook (Make / n8n)',
    description: 'Envía datos a automatización externa',
    icon: Webhook,
    iconName: 'webhook',
    color: 'slate'
  },
  {
    type: 'action',
    label: 'Actualizar CRM',
    description: 'Guarda datos en HubSpot/Salesforce',
    icon: Database,
    iconName: 'database',
    color: 'indigo'
  },
  {
    type: 'action',
    label: 'Enviar Email',
    description: 'Envía correo de seguimiento',
    icon: Mail,
    iconName: 'mail',
    color: 'indigo'
  },
  {
    type: 'action',
    label: 'Enviar a WhatsApp',
    description: 'Envía plantilla de WhatsApp',
    icon: Send,
    iconName: 'send',
    color: 'indigo'
  }
];

const colorMap = {
  emerald: {
    lightIcon: 'bg-emerald-100 text-emerald-600',
    lightHover: 'hover:border-emerald-300',
    darkIcon: 'bg-emerald-500/15 text-emerald-300',
    darkHover: 'hover:border-emerald-500/30',
  },
  indigo: {
    lightIcon: 'bg-indigo-100 text-indigo-600',
    lightHover: 'hover:border-indigo-300',
    darkIcon: 'bg-indigo-500/15 text-indigo-300',
    darkHover: 'hover:border-indigo-500/30',
  },
  amber: {
    lightIcon: 'bg-amber-100 text-amber-600',
    lightHover: 'hover:border-amber-300',
    darkIcon: 'bg-amber-500/15 text-amber-300',
    darkHover: 'hover:border-amber-500/30',
  },
  slate: {
    lightIcon: 'bg-slate-800 text-slate-300',
    lightHover: 'hover:border-slate-400',
    darkIcon: 'bg-slate-700 text-slate-200',
    darkHover: 'hover:border-slate-500',
  },
} as const;

export default function Sidebar() {
  const [darkMode, setDarkMode] = useState(false);

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

  const onDragStart = (
    event: DragEvent<HTMLDivElement>,
    nodeType: string,
    label: string,
    description: string,
    iconName: string
  ) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/label', label);
    event.dataTransfer.setData('application/description', description);
    event.dataTransfer.setData('application/icon', iconName);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside
      className={cn(
        "w-72 border-r flex flex-col h-full overflow-y-auto",
        darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      )}
    >
      <div className={cn("p-4 border-b", darkMode ? "border-slate-800" : "border-slate-200")}>
        <h3 className={cn("font-semibold", darkMode ? "text-white" : "text-slate-900")}>
          Nodos Disponibles
        </h3>
        <p className={cn("text-xs mt-1", darkMode ? "text-slate-400" : "text-slate-500")}>
          Arrastra los nodos al lienzo para construir tu flujo.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Triggers Section */}
        <div>
          <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-3", darkMode ? "text-slate-500" : "text-slate-400")}>
            Triggers
          </h4>
          <div className="space-y-2">
            {nodeTypes.filter(n => n.type === 'trigger').map((node, i) => {
              const styles = colorMap[node.color as keyof typeof colorMap];
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 p-3 border rounded-lg cursor-grab transition-all",
                    darkMode
                      ? "bg-slate-900 border-slate-800 hover:shadow-sm"
                      : "bg-white border-slate-200 hover:shadow-sm",
                    darkMode ? styles.darkHover : styles.lightHover
                  )}
                  onDragStart={(e) => onDragStart(e, node.type, node.label, node.description, node.iconName)}
                  draggable
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                      darkMode ? styles.darkIcon : styles.lightIcon
                    )}
                  >
                    <node.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={cn("text-sm font-medium", darkMode ? "text-white" : "text-slate-900")}>
                      {node.label}
                    </div>
                    <div className={cn("text-xs mt-0.5", darkMode ? "text-slate-400" : "text-slate-500")}>
                      {node.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions Section */}
        <div>
          <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-3", darkMode ? "text-slate-500" : "text-slate-400")}>
            Acciones
          </h4>
          <div className="space-y-2">
            {nodeTypes.filter(n => n.type === 'action').map((node, i) => {
              const styles = colorMap[node.color as keyof typeof colorMap];
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 p-3 border rounded-lg cursor-grab transition-all",
                    darkMode
                      ? "bg-slate-900 border-slate-800 hover:shadow-sm"
                      : "bg-white border-slate-200 hover:shadow-sm",
                    darkMode ? styles.darkHover : styles.lightHover
                  )}
                  onDragStart={(e) => onDragStart(e, node.type, node.label, node.description, node.iconName)}
                  draggable
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                      darkMode ? styles.darkIcon : styles.lightIcon
                    )}
                  >
                    <node.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={cn("text-sm font-medium", darkMode ? "text-white" : "text-slate-900")}>
                      {node.label}
                    </div>
                    <div className={cn("text-xs mt-0.5", darkMode ? "text-slate-400" : "text-slate-500")}>
                      {node.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Logic & Integrations Section */}
        <div>
          <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-3", darkMode ? "text-slate-500" : "text-slate-400")}>
            Lógica e Integraciones
          </h4>
          <div className="space-y-2">
            {nodeTypes.filter(n => ['condition', 'integration'].includes(n.type)).map((node, i) => {
              const styles = colorMap[node.color as keyof typeof colorMap];
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 p-3 border rounded-lg cursor-grab transition-all",
                    darkMode
                      ? "bg-slate-900 border-slate-800 hover:shadow-sm"
                      : "bg-white border-slate-200 hover:shadow-sm",
                    darkMode ? styles.darkHover : styles.lightHover
                  )}
                  onDragStart={(e) => onDragStart(e, node.type, node.label, node.description, node.iconName)}
                  draggable
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                      darkMode ? styles.darkIcon : styles.lightIcon
                    )}
                  >
                    <node.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className={cn("text-sm font-medium", darkMode ? "text-white" : "text-slate-900")}>
                      {node.label}
                    </div>
                    <div className={cn("text-xs mt-0.5", darkMode ? "text-slate-400" : "text-slate-500")}>
                      {node.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}