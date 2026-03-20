import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoUrl from '../assets/logo.png';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem("theme") === "dark" || document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    navigate(['superadmin', 'subadmin'].includes(user.role) ? '/admin' : '/', { replace: true });
    return null;
  }

  return (
    <div className={cn(
      "min-h-screen flex w-full font-sans relative overflow-hidden items-center justify-center p-6 sm:p-12 lg:p-24 selection:bg-cyan-400/30 transition-colors duration-500",
      darkMode ? "bg-[#1a0538]" : "bg-slate-50"
    )}>

      {/* Botón Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={cn(
          "absolute top-6 right-6 lg:top-8 lg:right-10 p-2.5 rounded-full transition-all duration-300 shadow-sm border backdrop-blur-md z-50",
          darkMode
            ? "bg-[#2d0e5a]/50 border-white/10 text-yellow-500 hover:bg-[#2d0e5a]"
            : "bg-white/80 border-slate-200 text-indigo-600 hover:bg-white hover:shadow-[0_0_15px_rgba(79,70,229,0.1)]"
        )}
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Elementos decorativos de fondo tipo capas 3D (Aproximación por CSS fluido) */}
      <div className={cn(
        "absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-[100%] blur-[80px] pointer-events-none transform -rotate-12 transition-colors duration-500",
        darkMode ? "bg-gradient-to-br from-cyan-400/10 via-purple-600/20 to-transparent" : "bg-gradient-to-br from-indigo-300/30 via-purple-300/30 to-transparent"
      )}></div>
      <div className={cn(
        "absolute top-[-10%] left-[5%] w-[40vw] h-[40vw] rounded-[100%] blur-[60px] pointer-events-none transform rotate-45 transition-colors duration-500",
        darkMode ? "bg-gradient-to-tl from-indigo-500/20 to-transparent" : "bg-gradient-to-tl from-indigo-400/20 to-transparent"
      )}></div>
      <div className={cn(
        "absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-[100%] blur-[100px] pointer-events-none transition-colors duration-500",
        darkMode ? "bg-purple-900/40" : "bg-indigo-200/40"
      )}></div>

      <div className="w-full max-w-[1300px] flex flex-col lg:flex-row items-center justify-between z-10 gap-16 lg:gap-24">

        {/* Lado izquierdo - Branding */}
        <div className="flex-1 flex flex-col justify-center max-w-2xl">
          <div className="mb-10 w-full flex">
            {/* Logo super grande como la imagen abstracta en la referencia */}
            <img
              src={logoUrl}
              alt="Sellia Logo"
              className={cn(
                "w-full max-w-[480px] h-auto object-contain transition-all duration-500",
                darkMode ? "drop-shadow-[0_0_40px_rgba(168,85,247,0.4)] hover:drop-shadow-[0_0_60px_rgba(168,85,247,0.6)]" : "drop-shadow-2xl"
              )}
            />
          </div>
          <h1 className={cn(
            "text-3xl sm:text-[34px] md:text-[44px] font-medium leading-[1.25] mb-10 tracking-wide",
            darkMode ? "text-white/95" : "text-slate-800"
          )}>
            Estás a punto de acceder a<br />
            una de las aplicaciones core<br />
            de Sellia™:<br />
            <span className={cn("font-bold", darkMode ? "text-white" : "text-slate-900")}>Plataforma Inteligente Comercial™</span>
          </h1>

          <div className="flex flex-wrap items-center gap-4">
            <button className={cn(
              "px-8 py-3 rounded-xl border text-sm font-semibold transition-all backdrop-blur-sm",
              darkMode
                ? "border-white/20 text-white/90 hover:bg-white/10"
                : "border-slate-300 text-slate-700 hover:bg-slate-100"
            )}>
              ¿Qué esperar?
            </button>
            <button className={cn(
              "px-4 py-3 text-sm font-semibold transition-colors",
              darkMode ? "text-white/60 hover:text-white" : "text-slate-500 hover:text-slate-800"
            )}>
              Otras Aplicaciones Futuras
            </button>
          </div>
        </div>

        {/* Lado derecho - Formulario de Login */}
        <div className="w-full max-w-[460px] lg:shrink-0">
          <div className={cn(
            "backdrop-blur-xl border rounded-[2rem] p-8 sm:p-12 shadow-[0_20px_80px_rgba(0,0,0,0.5)] transition-colors duration-500",
            darkMode ? "bg-[#2d0e5a]/30 border-white/10" : "bg-white/80 border-slate-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]"
          )}>
            <h2 className={cn("text-[24px] font-bold mb-8 tracking-wide", darkMode ? "text-white" : "text-slate-900")}>
              Iniciar Sesión en Sellia™
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-2.5">
                <label className={cn("block text-[13px] font-medium ml-1", darkMode ? "text-white/80" : "text-slate-600")}>Tu Email</label>
                <div className="relative group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@empresa.com"
                    required
                    className={cn(
                      "w-full rounded-2xl px-5 py-4 outline-none transition-all text-sm font-medium",
                      darkMode
                        ? "bg-[#170530]/40 border-2 border-white/10 hover:border-white/20 text-white placeholder-white/20 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 shadow-inner"
                        : "bg-slate-50/50 border-2 border-slate-200 hover:border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10"
                    )}
                  />
                  <div className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-colors", darkMode ? "text-white/20 group-focus-within:text-cyan-400/50" : "text-slate-400 group-focus-within:text-indigo-500/50")}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className={cn("block text-[13px] font-medium ml-1", darkMode ? "text-white/80" : "text-slate-600")}>Tu Contraseña</label>
                <div className="relative group">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    className={cn(
                      "w-full rounded-2xl px-5 py-4 outline-none transition-all text-sm tracking-widest font-medium",
                      darkMode
                        ? "bg-[#170530]/40 border-2 border-white/10 hover:border-white/20 text-white placeholder-white/20 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 shadow-inner"
                        : "bg-slate-50/50 border-2 border-slate-200 hover:border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10"
                    )}
                  />
                  <div className={cn("absolute right-4 top-1/2 -translate-y-1/2 transition-colors", darkMode ? "text-white/20 group-focus-within:text-cyan-400/50" : "text-slate-400 group-focus-within:text-indigo-500/50")}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full font-bold text-[15px] py-4 rounded-2xl transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex justify-center items-center mt-8 cursor-pointer select-none",
                  darkMode
                    ? "bg-gradient-to-r from-[#8be6ec] to-[#6ed8df] hover:from-[#76dee3] hover:to-[#5bc3cb] text-[#0f2e33] shadow-[0_0_20px_rgba(139,230,236,0.2)] hover:shadow-[0_0_30px_rgba(139,230,236,0.4)] hover:-translate-y-0.5"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
                )}
              >
                {loading ? (
                  <div className={cn("w-5 h-5 border-2 rounded-full animate-spin", darkMode ? "border-[#0f2e33]/30 border-t-[#0f2e33]" : "border-white/30 border-t-white")} />
                ) : (
                  'Ingresar'
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
