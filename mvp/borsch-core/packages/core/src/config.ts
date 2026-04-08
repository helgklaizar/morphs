// Centralized configuration for the RMS platform
// Handles environment variables for both Node.js and Vite environments

const getEnv = (key: string, defaultValue: string): string => {
  // Check Vite (client-side)
  const meta = import.meta as any;
  if (typeof meta !== 'undefined' && meta.env && meta.env[`VITE_${key}`]) {
    return meta.env[`VITE_${key}`] as string;
  }
  
  // Check Node.js (server-side)
  const proc = typeof process !== 'undefined' ? process : null;
  if (proc && proc.env && proc.env[key]) {
    return proc.env[key] as string;
  }

  return defaultValue;
};


export const API_URL = getEnv('API_URL', 'http://localhost:3002/api');
export const SSE_URL = getEnv('SSE_URL', 'http://localhost:3002/api/events');
