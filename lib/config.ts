
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return (import.meta as any).env?.[key];
  } catch {
    return undefined;
  }
};

export const API_URL = (getEnv('VITE_API_URL') || '').replace(/\/$/, '');
