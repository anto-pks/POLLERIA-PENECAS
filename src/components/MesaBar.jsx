// src/components/MesaBar.jsx
import React from "react";

export default function MesaBar({ MESAS_TOTAL, mesaSel, setMesaSel, mesaOcupada }) {
  return (
    <footer className="mesas-bar">
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