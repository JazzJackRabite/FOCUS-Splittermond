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
  <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
    <div id="confirm-dialog-card" className="bg-[#faf4e6] dark-theme-panel p-6 rounded-xl border-2 border-[#C5A059] shadow-2xl max-w-sm w-full">
      <h3 className="fantasy-font text-xl mb-4 text-[#1B365D] border-b border-[#C5A059] pb-2">
        {title}
      </h3>
      <p className="text-sm text-stone-700 mb-6 leading-relaxed">{message}</p>
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-[#1B365D] hover:bg-[#ebdcc4] rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          Abbrechen
        </button>
        <button
          onClick={onConfirm}
          className="px-5 py-2 bg-[#1B365D] hover:bg-[#2a4f7e] text-white rounded-lg font-bold text-sm shadow-xs border border-[#10233f] transition-all cursor-pointer shrink-0"
        >
          OK
        </button>
      </div>
    </div>
  </div>
);
