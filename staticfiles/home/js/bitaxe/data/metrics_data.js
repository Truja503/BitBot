// metrics_data.js — Live metrics definitions for BitAxe dashboard

export const METRICS = [
  { id: 'hashrate',   label: 'Hash Rate',       unit: 'GH/s', sim: () => (400 + Math.random()*80).toFixed(1),    color: '#f97316', desc: 'Computational work performed per second. Higher = better chance of finding a share.' },
  { id: 'efficiency', label: 'Efficiency',       unit: 'J/TH', sim: () => (25 + Math.random()*5).toFixed(1),     color: '#22c55e', desc: 'Joules consumed per terahash. Lower is more energy efficient.' },
  { id: 'temp',       label: 'ASIC Temp',        unit: '°C',   sim: () => (52 + Math.random()*8).toFixed(0),     color: '#ef4444', desc: 'ASIC die temperature. Keep below 65°C. Above 70°C throttles automatically.' },
  { id: 'fan',        label: 'Fan Speed',        unit: 'RPM',  sim: () => (2800 + Math.random()*400).toFixed(0), color: '#3b82f6', desc: 'Fan rotation speed. Increases automatically with temperature.' },
  { id: 'shares',     label: 'Accepted Shares',  unit: '',     sim: () => String(Math.floor(Math.random()*20)),  color: '#a855f7', desc: 'Valid work units submitted to the pool and accepted. Each share proves real work was done.' },
  { id: 'bestdiff',   label: 'Best Difficulty',  unit: '',     sim: () => (Math.random()*500).toFixed(0)+'K',    color: '#6366f1', desc: 'Highest difficulty share ever found. Bigger = closer to finding a full block.' },
  { id: 'power',      label: 'Power Draw',       unit: 'W',    sim: () => (8 + Math.random()*4).toFixed(1),      color: '#eab308', desc: 'Total power consumption. Includes ASIC + ESP32 + fan.' },
  { id: 'uptime',     label: 'Uptime',           unit: '',     sim: () => '2h 14m',                              color: '#14b8a6', desc: 'Time since last restart. Longer uptime = more stable operation.' },
  { id: 'frequency',  label: 'ASIC Frequency',   unit: 'MHz',  sim: () => '490',                                 color: '#f97316', desc: 'Clock speed of the BM1366 ASIC. Default 490 MHz is safe. Higher = more heat.' },
  { id: 'voltage',    label: 'Core Voltage',     unit: 'mV',   sim: () => '1200',                                color: '#6E5BFF', desc: 'Voltage supplied to ASIC core. Default 1200mV. Adjust carefully with frequency.' },
];
