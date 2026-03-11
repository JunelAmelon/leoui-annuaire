'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getClientFullData, getClientFullDataWithEmail, getClientEvent, ClientData, EventData } from '@/lib/client-helpers';

interface ClientDataContextType {
  client: ClientData | null;
  event: EventData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ClientDataContext = createContext<ClientDataContextType>({
  client: null,
  event: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function ClientDataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [client, setClient] = useState<ClientData | null>(null);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let clientData = await getClientFullData(user.uid);

      if (!clientData && user.email) {
        clientData = await getClientFullDataWithEmail(user.email);
      }

      setClient(clientData);

      if (clientData?.id) {
        const eventData = await getClientEvent(clientData.id);
        setEvent(eventData);
      }
    } catch (e) {
      console.error('Error fetching client data:', e);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, authLoading]);

  return (
    <ClientDataContext.Provider value={{ client, event, loading, error, refresh: fetchData }}>
      {children}
    </ClientDataContext.Provider>
  );
}

export function useClientData() {
  return useContext(ClientDataContext);
}

export default ClientDataContext;
