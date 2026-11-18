'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import { AlertCircle, AlertTriangle, Check, Info } from 'lucide-react';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        gap={14}
        closeButton
        icons={{
          success: <Check className="h-[17px] w-[17px] text-white" strokeWidth={2.5} />,
          error: <AlertCircle className="h-[17px] w-[17px] text-white" strokeWidth={2} />,
          warning: <AlertTriangle className="h-[17px] w-[17px] text-white" strokeWidth={2} />,
          info: <Info className="h-[17px] w-[17px] text-white" strokeWidth={2} />,
        }}
        toastOptions={{
          classNames: {
            title: 'leoui-toast-title',
            description: 'leoui-toast-desc',
            actionButton: 'leoui-toast-btn',
            cancelButton: 'leoui-toast-cancel',
            closeButton: 'leoui-toast-close',
          },
        }}
      />
    </AuthProvider>
  );
}
