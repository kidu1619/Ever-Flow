"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={isLoading ? undefined : onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FBF9F5] border border-stone-200/90 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  variant === "danger"
                    ? "bg-rose-100 text-rose-600"
                    : variant === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-[#E06B53]/15 text-[#E06B53]"
                }`}
              >
                {variant === "danger" ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold font-serif text-slate-900">{title}</h3>
                <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">
                  Action Confirmation
                </span>
              </div>
            </div>
            {!isLoading && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-stone-600 leading-relaxed bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs">
            {message}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition flex items-center space-x-1.5 ${
                variant === "danger"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : variant === "warning"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-[#E06B53] hover:bg-[#c95841]"
              } disabled:opacity-50`}
            >
              {isLoading && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
