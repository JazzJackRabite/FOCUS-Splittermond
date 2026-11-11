import React from 'react';

interface ConfirmDialogProps {
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title = 'Bestätigung',
  message,
  onConfirm,
  onCancel,
}) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div id="confirm-dialog-card" className="bg-flaeche p-6 rounded-karte border border-rahmen shadow-2xl max-w-sm w-full">
      <h3 className="fantasy-font text-xl mb-4 text-gold-hell border-b border-gold pb-2">
        {title}
      </h3>
      <p className="text-sm text-schrift mb-6 leading-relaxed">{message}</p>
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-schrift hover:bg-rahmen rounded-knopf font-semibold text-sm transition-colors cursor-pointer"
        >
          Abbrechen
        </button>
        <button
          onClick={onConfirm}
          className="px-5 py-2 bg-erhoeht hover:bg-rahmen text-schrift rounded-knopf font-bold text-sm border border-rahmen transition-all cursor-pointer shrink-0"
        >
          OK
        </button>
      </div>
    </div>
  </div>
);
