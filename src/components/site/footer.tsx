export default function Footer() {
  return (
    <footer className="py-20 glass-footer relative z-10">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.5em] text-slate-800 dark:text-slate-500 mb-2">
            ENGINEERING MASTERY & ENERGY SOLUTIONS
        </p>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-950 dark:text-slate-400">
            © {new Date().getFullYear()} energy engine • Todos los derechos reservados
        </p>
      </div>
    </footer>
  );
}
