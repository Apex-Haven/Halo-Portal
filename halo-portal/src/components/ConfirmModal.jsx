import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger' // 'danger' | 'warning' | 'info'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'text-red-600 dark:text-red-400',
      button: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
    },
    warning: {
      icon: 'text-yellow-600 dark:text-yellow-400',
      button: 'bg-yellow-600 text-white hover:bg-yellow-700'
    },
    info: {
      icon: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 text-white hover:bg-blue-700'
    }
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-card rounded-lg shadow-2xl border border-border max-w-md w-full z-[2001]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start gap-4 p-6 border-b border-border">
                <div className={`flex-shrink-0 ${styles.icon}`}>
                  <AlertTriangle size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {message}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-1 rounded-lg bg-transparent hover:bg-accent text-muted-foreground hover:text-accent-foreground transition-colors"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${styles.button}`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default ConfirmModal;

