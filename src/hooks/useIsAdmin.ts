import { useUser } from '@clerk/expo';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export const useIsAdmin = () => {
  const { user: clerkUser } = useUser();
  const token = useAuthStore((s) => s.token);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      if (!clerkUser || !token) {
        if (isMounted) {
          setIsAdmin(false);
          setIsCheckingAdmin(false);
        }
        return;
      }

      setIsCheckingAdmin(true);
      try {
        const res = await api.get('/users/me');
        const userData = res.data?.data || res.data;
        if (isMounted) {
          setIsAdmin(userData?.role === 'admin');
        }
      } catch {
        if (isMounted) {
          setIsAdmin(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingAdmin(false);
        }
      }
    };

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [clerkUser?.id, token]);

  return { isAdmin, isCheckingAdmin };
};
