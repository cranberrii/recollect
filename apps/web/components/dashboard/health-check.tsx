'use client';

import { useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function HealthCheck() {
  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => {
        if (!res.ok) {
          console.warn('Backend health check failed (API is starting up) - ', res.status);
        }
      })
      .catch((err) => {
        console.warn('Backend is unreachable (API is starting up):', err.message);
      });
  }, []);

  return null;
}
