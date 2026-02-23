
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/firebase/config'; // Asegúrate de tener tu config de firebase
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query 
} from 'firebase/firestore';

export default function AdminPage() {
  const [inspectores, setInspectores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos
  const fetchInspectores = async () => {
    setLoading(true);
    const q = query(collection(db, "inspectores"));
    const querySnapshot = await getDocs(q);
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setInspectores(docs);
    setLoading(false);
  };

  useEffect(() => {
    fetchInspectores();
  }, []);

  // Función para cambiar estado activo/inactivo
  const toggleEstado = async (id, estadoActual) => {
    const docRef = doc(db, "inspectores", id);
    await updateDoc(docRef, { activo: !estadoActual });
    fetchInspectores();
  };

  // Función para borrar (Usar con cuidado)
  const eliminarInspector = async (id) => {
    if(confirm("¿Estás seguro de eliminar a este inspector?")) {
      await deleteDoc(doc(db, "inspectores", id));
      fetchInspectores();
    }
  };

  // Función para crear los inspectores iniciales (puedes llamarla una vez)
  const seedInspectores = async () => {
    const lista = [
      { nombre: "Carlos Esteban Amarilla Bogado", dni: "70287885-T", email: "", activo: true, rol: "inspector" },
      { nombre: "Antonio Ugena Del Cerro", dni: "50475775-K", email: "", activo: true, rol: "inspector" },
      { nombre: "Mocanu Baluta", dni: "X4266252-M", email: "", activo: true, rol: "inspector" },
      { nombre: "Juan Carlos Cabral", dni: "X-6112156-K", email: "", activo: true, rol: "inspector" },
      { nombre: "Pablo Garcia", dni: "Admin", email: "pablofgarciaf@gmail.com", activo: true, rol: "admin" }
    ];

    for (const ins of lista) {
      await addDoc(collection(db, "inspectores"), ins);
    }
    alert("Inspectores creados correctamente");
    fetchInspectores();
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Panel de Administración</h1>
          <button 
            onClick={seedInspectores}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Cargar Inspectores Iniciales
          </button>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-100 border-b">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Nombre</th>
                <th className="p-4 font-semibold text-slate-600">DNI/NIE</th>
                <th className="p-4 font-semibold text-slate-600">Email</th>
                <th className="p-4 font-semibold text-slate-600">Estado</th>
                <th className="p-4 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inspectores.map((ins) => (
                <tr key={ins.id} className="border-b hover:bg-slate-50">
                  <td className="p-4">{ins.nombre}</td>
                  <td className="p-4 text-slate-500">{ins.dni}</td>
                  <td className="p-4 text-slate-500">{ins.email || '—'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${ins.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {ins.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <button 
                      onClick={() => toggleEstado(ins.id, ins.activo)}
                      className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded"
                    >
                      {ins.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button 
                      onClick={() => eliminarInspector(ins.id)}
                      className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}