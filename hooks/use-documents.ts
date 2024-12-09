import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Document } from '@/types';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!isSignedIn) {
        setDocuments([]);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/documents');
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }
        const data = await response.json();
        setDocuments(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch documents'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [isSignedIn]);

  return {
    documents,
    isLoading,
    error,
    setDocuments
  };
} 