'use client';

/**
 * Лайтбокс для просмотра изображений в чате
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface VIPImageLightboxProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const VIPImageLightbox = ({ imageUrl, onClose }: VIPImageLightboxProps) => {
  return (
    <AnimatePresence>
      {imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-1"
          onClick={onClose}
        >
          <motion.img
            src={imageUrl}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="max-w-full max-h-[90dvh] object-contain rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={onClose}
          >
            <X className="w-8 h-8" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
