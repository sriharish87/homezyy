import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axiosConfig';

// Define the shape of our data
export interface Subservice {
  title: string;
  price: string;
  rating: string;
  reviews: string;
  duration: string;
  img: string;
  tab: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  count: string;
  subservices: Subservice[];
}

interface ServiceContextProps {
  categories: ServiceCategory[];
  allSubservices: Record<string, Subservice[]>;
  isLoading: boolean;
  error: string | null;
  refreshServices: () => Promise<void>;
}

const ServiceContext = createContext<ServiceContextProps | undefined>(undefined);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [allSubservices, setAllSubservices] = useState<Record<string, Subservice[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Ensure your backend server is running and accessible
      const response = await api.get('/api/services');
      const data: ServiceCategory[] = response.data;
      
      setCategories(data);
      
      // Build the dictionary format (ALL_SUBSERVICES)
      const dict: Record<string, Subservice[]> = {};
      data.forEach(category => {
        dict[category.name] = category.subservices;
      });
      setAllSubservices(dict);
    } catch (err: any) {
      setError(err.message || 'Failed to load services');
      console.error('Error fetching services:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <ServiceContext.Provider value={{ categories, allSubservices, isLoading, error, refreshServices: fetchServices }}>
      {children}
    </ServiceContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
};
