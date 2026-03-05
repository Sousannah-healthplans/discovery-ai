import { Github, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-cyan-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid gap-6 md:grid-cols-3">
        <div>
          <div className="font-extrabold text-white text-lg">Discovery AI</div>
          <p className="text-sm mt-2">See product behavior in motion — insights with style.</p>
        </div>
        <nav className="grid gap-2 text-sm">
          <Link to="/" className="hover:text-white">Home</Link>
          <Link to="/schedule-demo" className="hover:text-white">Schedule Demo</Link>
          <Link to="/login" className="hover:text-white">Login</Link>
        </nav>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/Sousannah"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="hover:text-slate-900 dark:hover:text-white"
          >
            <Github size={18} />
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitter"
            className="hover:text-slate-900 dark:hover:text-white"
          >
            <Twitter size={18} />
          </a>
        </div>
      </div>
      <div className="text-xs text-center py-4 border-t border-slate-200 dark:border-white/10">© {new Date().getFullYear()} Discovery AI</div>
    </footer>
  );
}


