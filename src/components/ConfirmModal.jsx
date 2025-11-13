import React from "react";

export default function ConfirmModal({ open, total, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      onClick={onCancel}
    >
      <div
        className="confirm-box"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>¿Cobrar esta cuenta?</h3>
        <p>
          Monto total: <strong>S/ {total.toFixed(2)}</strong>
        </p>

        <div className="confirm-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn-confirm" onClick={onConfirm}>
            Confirmar cobro
          </button>
        </div>
      </div>
    </div>
  );
}
