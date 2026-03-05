import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { SessionsLine } from '../components/Charts';
import { fetchOverview } from '../lib/api';
import SiteLayout from '../layouts/SiteLayout';
import CTAButton from '../components/CTAButton';
import { Link } from 'react-router-dom';
import { BACKEND_URL } from '../lib/config';

export default function Home() {
  const [sessionsOverTime, setSessionsOverTime] = useState([])
  const baseUrl = BACKEND_URL
  const projectId = localStorage.getItem('projectId') || 'discovery-ai'
  const token = localStorage.getItem('authToken') || ''
  useEffect(() => {
    if (!baseUrl || !token) return
    fetchOverview(baseUrl, projectId, token).then(res => {
      setSessionsOverTime((res.charts && res.charts.sessionsOverTime) || [])
    }).catch(()=>{})
  }, [baseUrl, projectId, token])
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const rotateY = (px - 0.5) * 16; // left/right
    const rotateX = (0.5 - py) * 12; // up/down
    setTilt({ x: rotateY, y: rotateX });
  };

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 });

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  return (
    <SiteLayout>
      <section className="relative overflow-hidden">
        {/* Animated background */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/40 to-cyan-500/30 blur-3xl dark:from-orange-400/25 dark:to-cyan-500/25"
          animate={{ y: [0, 30, 0], x: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-gradient-to-tr from-cyan-500/30 to-violet-500/30 blur-3xl dark:from-cyan-500/20 dark:to-violet-500/20"
          animate={{ y: [0, -40, 0], x: [0, -10, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-16 md:pb-24">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="text-center"
          >
            <motion.h1 variants={item} className="text-5xl md:text-7xl font-extrabold leading-tight">
              <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-cyan-500 bg-clip-text text-transparent">
                Discovery AI
              </span>
            </motion.h1>
            <motion.p variants={item} className="mt-4 text-xl md:text-2xl font-semibold text-slate-900/80 dark:text-white/80">
              See every interaction. Predict every move.
            </motion.p>
            <motion.p variants={item} className="mt-3 text-slate-600 dark:text-cyan-200 max-w-2xl mx-auto">
              Analytics that feel alive — cinematic timelines, heatmaps, and instant insight.
            </motion.p>
            <motion.div variants={item} className="mt-8 flex items-center justify-center gap-4">
              <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ y: 0, scale: 1 }}>
                <CTAButton className="px-6 py-3 text-base"><Link to="/schedule-demo">Book a Live Demo</Link></CTAButton>
              </motion.div>
              <motion.div whileHover={{ y: -3, scale: 1.02 }} whileTap={{ y: 0, scale: 1 }}>
                <CTAButton className="px-6 py-3 text-base bg-gradient-to-r from-orange-500 to-cyan-500"><Link to="/login">Get Started</Link></CTAButton>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 3D tilt showcase card */}
          <div className="mt-14 md:mt-16 flex justify-center">
            <motion.div
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="relative w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur md:p-8 dark:border-white/10 dark:bg-white/5"
              style={{
                transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
                transition: 'transform 200ms ease-out'
              }}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-sm text-slate-500 dark:text-cyan-200">Active Sessions</div>
                  <div className="mt-1 text-2xl font-bold">1,248</div>
                  <motion.div className="mt-3 h-2 rounded-full bg-gradient-to-r from-orange-400 to-cyan-500" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, ease: 'easeOut' }} style={{ transformOrigin: 'left' }} />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-sm text-slate-500 dark:text-cyan-200">Conversion</div>
                  <div className="mt-1 text-2xl font-bold">4.7%</div>
                  <motion.div className="mt-3 h-2 rounded-full bg-gradient-to-r from-rose-400 to-violet-500" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.4, ease: 'easeOut', delay: 0.1 }} style={{ transformOrigin: 'left' }} />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-sm text-slate-500 dark:text-cyan-200">CSAT</div>
                  <div className="mt-1 text-2xl font-bold">92</div>
                  <motion.div className="mt-3 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-500" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.6, ease: 'easeOut', delay: 0.2 }} style={{ transformOrigin: 'left' }} />
                </div>
              </div>
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{
                  background:
                    'radial-gradient(600px 200px at 50% -10%, rgba(255,255,255,0.6), transparent), radial-gradient(400px 180px at 0% 110%, rgba(255,153,102,0.15), transparent), radial-gradient(400px 180px at 100% 110%, rgba(56,189,248,0.15), transparent)'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Graph-first analysis section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-400/20 to-transparent blur-3xl" />
        </motion.div>

        <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-xl backdrop-blur dark:border-white/10 dark:bg-white/5 md:p-10">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-2xl font-bold tracking-tight">Sessions Over Time</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-cyan-200">Real-time motion with predictive smoothing for trend clarity.</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-cyan-200">Last 6 days</div>
              <div className="text-xl font-semibold">Live</div>
            </div>
          </div>
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <SessionsLine data={sessionsOverTime} />
          </motion.div>

          <motion.div
            className="mt-6 grid gap-4 sm:grid-cols-3"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
          >
            {[
              { label: 'Peak Sessions', value: '79', accent: 'from-cyan-400 to-emerald-500' },
              { label: '7‑day Drift', value: '+18%', accent: 'from-rose-400 to-violet-500' },
              { label: 'Signal Quality', value: 'High', accent: 'from-orange-400 to-yellow-400' },
            ].map(({ label, value, accent }) => (
              <motion.div key={label} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs text-slate-500 dark:text-cyan-200">{label}</div>
                <div className="mt-1 text-2xl font-bold">{value}</div>
                <div className={`mt-3 h-1.5 rounded-full bg-gradient-to-r ${accent}`} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

  {/* Features section */}
  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
    <motion.div initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} viewport={{once:true, amount:0.3}} transition={{duration:0.6}} className="text-center">
      <h3 className="text-3xl font-extrabold">Built for clarity</h3>
      <p className="mt-2 text-slate-600 dark:text-cyan-200 max-w-2xl mx-auto">From the snippet to the signal — every detail crafted for speed, fidelity, and privacy.</p>
    </motion.div>
    <div className="mt-10 grid gap-6 md:grid-cols-3">
      {[{
        title: 'Browser Extension',
        desc: 'Install our Chrome extension. Start tracking your activity instantly.',
        accent: 'from-orange-400 to-rose-500'
      },{
        title: 'Cinematic timelines',
        desc: 'See every click, scroll, and state change — beautifully replayed.',
        accent: 'from-cyan-400 to-violet-500'
      },{
        title: 'Privacy by default',
        desc: 'PII masking and consent baked in. SOC2‑ready foundation.',
        accent: 'from-emerald-400 to-cyan-500'
      }].map(({title,desc,accent})=> (
        <motion.div key={title} whileHover={{y:-4}} className="rounded-2xl p-6 bg-white/70 border border-slate-200 shadow-sm backdrop-blur dark:bg-white/5 dark:border-white/10">
          <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${accent}`} />
          <div className="mt-4 font-semibold text-lg">{title}</div>
          <p className="text-sm text-slate-600 dark:text-cyan-200 mt-1">{desc}</p>
        </motion.div>
      ))}
    </div>
  </section>

  {/* Extension explainer section */}
  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
    <div className="rounded-3xl border border-slate-200 bg-white/70 p-8 shadow-xl backdrop-blur dark:border-white/10 dark:bg-white/5">
      <div className="grid gap-8 md:grid-cols-2 items-center">
        <div>
          <h3 className="text-2xl font-bold">Install the Discovery AI Extension</h3>
          <p className="mt-2 text-slate-600 dark:text-cyan-200">Install our Chrome extension to start tracking your browser activity. Create an account and view your personalized dashboard.</p>
          <div className="mt-4">
            <CTAButton><Link to="/login">View Dashboard</Link></CTAButton>
          </div>
        </div>
        <div>
          <div className="rounded-2xl p-4 bg-slate-100 text-slate-900 border border-slate-200 text-sm overflow-auto dark:bg-black/60 dark:text-white dark:border-white/10">
            <code>{`1. Install Discovery AI Extension
2. Create your account
3. Start browsing
4. View your activity dashboard`}</code>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white/70 p-8 text-center shadow-xl backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h3 className="text-2xl font-bold">Ready to see it live?</h3>
          <p className="mt-2 text-slate-600 dark:text-cyan-200">A guided tour of Discovery AI — in under 10 minutes.</p>
          <div className="mt-6">
            <CTAButton><Link to="/schedule-demo">Book a Demo</Link></CTAButton>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}


