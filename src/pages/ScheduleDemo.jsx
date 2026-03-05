import { useState } from 'react';
import SiteLayout from '../layouts/SiteLayout';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { motion } from 'framer-motion';

export default function ScheduleDemo() {
  const [date, setDate] = useState(new Date());
  const [success, setSuccess] = useState(false);

  function submit(e){
    e.preventDefault();
    setTimeout(()=> setSuccess(true), 400);
  }

  return (
    <SiteLayout>
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <motion.div aria-hidden className="pointer-events-none absolute -top-16 right-0 h-60 w-60 rounded-full bg-gradient-to-tr from-cyan-500/25 to-violet-500/25 blur-3xl" initial={{opacity:0}} animate={{opacity:1}} />
        <motion.form initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} onSubmit={submit} className="rounded-3xl p-8 bg-white/70 border border-slate-200 text-slate-800 shadow-xl backdrop-blur dark:bg-white/10 dark:border-white/10 dark:text-white">
          <h2 className="text-2xl font-bold">Schedule a Demo</h2>
          <div className="mt-6 grid gap-4">
            <input placeholder="Name" className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 dark:bg-black/40 dark:border-white/10 dark:text-white" />
            <input placeholder="Email" className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 dark:bg-black/40 dark:border-white/10 dark:text-white" />
            <input placeholder="Company" className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 dark:bg-black/40 dark:border-white/10 dark:text-white" />
            <DatePicker
              selected={date}
              onChange={setDate}
              showTimeSelect
              dateFormat="Pp"
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 w-full dark:bg-black/40 dark:border-white/10 dark:text-white"
            />
            <motion.button whileHover={{y:-2}} whileTap={{y:0}} className="mt-2 rounded-2xl px-4 py-2 bg-gradient-to-r from-cyan-600 to-orange-500 text-white font-semibold">Book Demo</motion.button>
            {success && <div role="status" className="text-green-600 dark:text-green-300">Booked! We'll email you shortly.</div>}
          </div>
        </motion.form>
      </div>
    </SiteLayout>
  );
}


