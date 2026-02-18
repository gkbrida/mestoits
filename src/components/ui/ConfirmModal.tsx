interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'success';
  loading?: boolean;
  /** Si true, affiche uniquement un bouton OK (pas de confirmation à deux choix) */
  infoOnly?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  loading = false,
  infoOnly = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    default: 'bg-teal-600 hover:bg-teal-700',
    danger: 'bg-red-600 hover:bg-red-700',
    success: 'bg-green-600 hover:bg-green-700',
  };

  const handleConfirm = () => {
    if (infoOnly) {
      onClose();
    } else {
      onConfirm?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          {!infoOnly && (
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={infoOnly ? onClose : handleConfirm}
            disabled={loading}
            className={`${infoOnly ? 'w-full' : 'flex-1'} px-4 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${variantStyles[variant]}`}
          >
            {loading ? (
              <>
                <i className="ri-loader-4-line animate-spin text-lg"></i>
                En cours...
              </>
            ) : (
              infoOnly ? 'OK' : confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
