'use client';
import {
  UNSTABLE_ToastRegion as ToastRegion,
  UNSTABLE_Toast as Toast,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastContent as ToastContent,
  type ToastProps,
  Button,
  Text,
} from 'react-aria-components/Toast';
import {X} from 'lucide-react';
import './Toast.css';
import { flushSync, createPortal } from 'react-dom';
import { useEffect, useState, type CSSProperties } from 'react';

export type ToastVariant = 'normal' | 'success' | 'error' | 'warning';

interface MyToastContent {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

// This is a global toast queue, to be imported and called where ever you want to queue a toast via queue.add().
export const queue = new ToastQueue<MyToastContent>({
  // Wrap state updates in a CSS view transition.
  wrapUpdate(fn) {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        flushSync(fn);
      });
    } else {
      fn();
    }
  }
});

export function MyToastRegion() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const region = (
    <ToastRegion queue={queue} className="app-toast-region">
      {({ toast }) => (
        <MyToast
          toast={toast}
          style={{ viewTransitionName: toast.key } as CSSProperties}
          data-variant={toast.content.variant || 'normal'}
        >
          <ToastContent>
            <Text slot="title">{toast.content.title}</Text>
            {toast.content.description && (
              <Text slot="description">{toast.content.description}</Text>
            )}
          </ToastContent>
          <Button slot="close" aria-label="Close" className="toast-close-btn">
            <X size={16} />
          </Button>
        </MyToast>
      )}
    </ToastRegion>
  );

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(region, document.body);
}

export function MyToast(props: ToastProps<MyToastContent> & { 'data-variant'?: string }) {
  return <Toast {...props} />;
}
