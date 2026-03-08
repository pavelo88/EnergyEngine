'use client';

import React from 'react';
import { stats } from '@/lib/data';

const Stats = () => {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 w-full">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
             <div
              key={index}
              className="flex flex-col items-center justify-center text-center p-6 h-40 rounded-2xl border bg-background/50 backdrop-blur-sm shadow-lg"
            >
                <Icon className="text-primary size-7 mb-2" />
                <span className="text-3xl font-black text-foreground">{stat.val}</span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.tag}</span>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default Stats;
