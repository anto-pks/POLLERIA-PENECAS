import React from "react";

export default function ConfirmModal({
  open,
  total = 0,
  title = "¿Cobrar esta cuenta?",
  subtitle = null,
  confirmLabel = "Confirmar cobro",
  confirmDisabled = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {subtitle ? (
          <p>{subtitle}</p>
        ) : (
          <p>
            Monto total: <strong>S/ {Number(total || 0).toFixed(2)}</strong>
          </p>
        )}

        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={confirmDisabled}>
            Cancelar
          </button>
          <button className="btn-confirm" onClick={onConfirm} disabled={confirmDisabled}>
            {confirmDisabled ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
