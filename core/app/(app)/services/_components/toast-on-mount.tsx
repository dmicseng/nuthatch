'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Fires a one-time success toast on mount when the URL contains a `?created=` or
 * `?updated=` param after a Server Action redirect. The list page uses this to
 * surface confirmation without needing the page itself to be a Client Component.
 */
export function ToastOnMount({ message }: { message: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    toast.success(message);
  }, [message]);
  return null;
}
