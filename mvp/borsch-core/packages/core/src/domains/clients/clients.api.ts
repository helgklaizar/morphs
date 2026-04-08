import { Client } from '@rms/types';
import { API_URL } from '../../config';


export const fetchClients = async (): Promise<Client[]> => {
  const res = await fetch(`${API_URL}/clients`);
  if (!res.ok) throw new Error('Failed to fetch clients');
  return res.json();
};

export const createClient = async (payload: Partial<Client>) => {
  return fetch(`${API_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
  }).then(r => r.json());
};
