// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, AlertTriangle, Wind } from 'lucide-react';
import { Client, Task } from '../types.ts';

interface GamifiedHealthProps {
  clients: Client[];
  tasks: Task[];
}

export function GamifiedHealth({ clients, tasks }: GamifiedHealthProps) {
  const [altitude, setAltitude] = useState(100); // 0 to 100
  const [dangerLevel, setDangerLevel] = useState(0); // 0 to 100

  useEffect(() => {
    // Calculate health based on overdue tasks and stalled clients
    const overdueTasks = tasks.filter(t => {
      const lastUpdate = new Date(t.updatedAt || t.createdAt);
      const diffDays = (new Date().getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);
      return t.status !== 'done' && diffDays > 3;
    }).length;

    const urgentClients = clients.filter(c => c.urgency === 'high').length;
    
    // Base altitude starts high, drops with issues
    let newAltitude = 100 - (overdueTasks * 5) - (urgentClients * 2);
    if (newAltitude < 0) newAltitude = 0;
    
    setAltitude(newAltitude);
    setDangerLevel(100 - newAltitude);
  }, [clients, tasks]);

  return (
    <div className="relative w-full h-64 bg-gradient-to-b from-sky-200 to-sky-50 overflow-hidden rounded-xl border border-sky-300 shadow-inner mb-8">
      {/* Background Elements */}
      <motion.div 
        animate={{ x: [0, 100, 0] }} 
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-4 left-10 text-white/60"
      >
        <Cloud size={48} fill="white" />
      </motion.div>
      <motion.div 
        animate={{ x: [0, -150, 0] }} 
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        className="absolute top-12 right-20 text-white/40"
      >
        <Cloud size={64} fill="white" />
      </motion.div>

      {/* The Balloon */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-10"
        animate={{ 
          y: `${100 - altitude}%`,
          rotate: [0, 2, -2, 0]
        }}
        transition={{ 
          y: { type: "spring", stiffness: 50 },
          rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{ bottom: '20%' }}
      >
        {/* Balloon Body */}
        <div className="relative">
          <div className={`w-24 h-32 rounded-full ${altitude > 50 ? 'bg-emerald-500' : altitude > 20 ? 'bg-amber-500' : 'bg-red-500'} shadow-lg transition-colors duration-1000 flex items-center justify-center`}>
            <span className="text-white font-black text-xl">{Math.round(altitude)}%</span>
          </div>
          {/* Basket */}
          <div className="w-8 h-8 bg-amber-800 mx-auto mt-1 rounded-sm relative">
            <div className="absolute -left-2 -right-2 top-0 h-px bg-amber-900" />
            {/* The Manager Character */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border border-black" />
          </div>
          {/* Ropes */}
          <div className="absolute top-28 left-6 w-0.5 h-4 bg-white/50 rotate-12" />
          <div className="absolute top-28 right-6 w-0.5 h-4 bg-white/50 -rotate-12" />
        </div>
      </motion.div>

      {/* Danger Zone / Crocodiles */}
      <div className="absolute bottom-0 w-full h-12 bg-emerald-800 flex items-end justify-center overflow-hidden">
        <div className="w-full h-4 bg-blue-500/30 absolute bottom-0 animate-pulse" />
        
        {/* Crocodiles appearing when danger is high */}
        <AnimatePresence>
          {dangerLevel > 50 && (
            <motion.div 
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="flex gap-20 absolute bottom-2 w-full justify-center"
            >
              {[1, 2, 3].map(i => (
                <motion.div 
                  key={i}
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}
                  className="text-emerald-900"
                >
                  <svg width="40" height="20" viewBox="0 0 40 20" fill="currentColor">
                    <path d="M0,20 L10,10 L20,20 L30,10 L40,20 Z" />
                    <circle cx="15" cy="15" r="2" fill="white" />
                  </svg>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Text */}
      <div className="absolute top-4 right-4 bg-white/80 backdrop-blur px-4 py-2 rounded-lg border border-sky-200 shadow-sm">
        <div className="flex items-center gap-2">
          {altitude > 80 ? (
            <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider">Smooth Sailing</span>
          ) : altitude > 40 ? (
            <span className="text-amber-600 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Wind size={14} /> Turbulence
            </span>
          ) : (
            <span className="text-red-600 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={14} /> MAYDAY!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
