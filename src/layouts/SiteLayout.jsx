import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function SiteLayout({ children }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-gradient-to-b dark:from-cyan-950 dark:via-slate-950 dark:to-black dark:text-white flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}


