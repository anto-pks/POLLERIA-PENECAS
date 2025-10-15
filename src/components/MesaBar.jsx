import React from "react";

export default function MesaBar({ MESAS_TOTAL, mesaSel, setMesaSel, mesaOcupada, crearParaLlevar }) {
  return (
    <footer className="mesas-bar">
      {/* Botón fijo para crear pedido para llevar */}
      <button
        className={`mesa-square carry ${String(mesaSel).startsWith("10") ? "activa":""}`}
        onClick={crearParaLlevar}
        title="Nuevo pedido para llevar">
        L+
      </button>

      {Array.from({length:MESAS_TOTAL},(_,i)=>i+1).map((n)=>{
        const ocup = mesaOcupada(n), active = n===mesaSel;
        return (
          <button key={n}
            className={`mesa-square ${ocup?"ocupada":"libre"} ${active?"activa":""}`}
            onClick={()=>setMesaSel(n)} title={ocup?"Ocupada":"Libre"}>
            M{n}
          </button>
        );
      })}
    </footer>
  );
}
