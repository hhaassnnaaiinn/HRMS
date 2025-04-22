import React from 'react';
import { Button } from './button';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-auto">
        <div className="flex items-center mb-4">
          <AlertCircle className="h-6 w-6 text-yellow-500 mr-2 flex-shrink-0" />
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" onClick={onCancel} fullWidth>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} fullWidth>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}