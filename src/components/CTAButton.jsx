import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function CTAButton({ children, className, ...props }) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative inline-flex items-center justify-center rounded-2xl px-5 py-2.5 font-semibold text-white',
        'bg-gradient-to-r from-cyan-600 via-teal-500 to-orange-500 shadow-lg shadow-orange-500/20',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan-300',
        'focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
        className
      )}
      {...props}
    >
      <span className="drop-shadow-sm">{children}</span>
    </motion.button>
  );
}


