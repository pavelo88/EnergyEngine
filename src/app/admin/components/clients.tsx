'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"; 
import { useFirestore } from '@/firebase';
import { PlusCircle, Trash2, Pencil, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Client = {
  id: string;
  nombre: string;
  direccion: string;
  email: string;
  telefono: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const db = useFirestore();

  useEffect(() => {
    if (!db) return;
    const unsubscribe = onSnapshot(collection(db, 'clientes'), (snapshot) => {
      const clientsList = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Client, 'id'>) }));
      setClients(clientsList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const clientData = {
        nombre: formData.get('nombre') as string,
        direccion: formData.get('direccion') as string,
        email: formData.get('email') as string,
        telefono: formData.get('telefono') as string,
    };

    try {
      if (editingClient) {
        const clientRef = doc(db, 'clientes', editingClient.id);
        await updateDoc(clientRef, clientData);
        alert(`Cliente ${clientData.nombre} actualizado.`);
      } else {
        await addDoc(collection(db, "clientes"), clientData);
        alert(`Cliente ${clientData.nombre} añadido.`);
      }
      closeModal();
    } catch (error) {
      console.error("Error al guardar cliente: ", error);
      alert("Error al guardar el cliente. Revisa la consola.");
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (window.confirm(`¿Seguro que quieres eliminar a ${client.nombre}?`)) {
      try {
        await deleteDoc(doc(db, 'clientes', client.id));
        alert(`Cliente ${client.nombre} eliminado.`);
      } catch (error) {
        console.error("Error al eliminar cliente: ", error);
        alert("Error al eliminar. Revisa la consola.");
      }
    }
  }

  const openModalForEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const openModalForAdd = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  return (
    <div className="space-y-8 text-slate-900">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Clientes</h1>
            <Button onClick={openModalForAdd}>
                <PlusCircle size={20}/>
                Añadir Cliente
            </Button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <div className="overflow-x-auto">
            {loading ? <p>Cargando...</p> : (
                <table className="w-full text-left">
                <thead><tr className="border-b"><th className="p-3">Nombre</th><th className="p-3">Dirección</th><th className="p-3">Email</th><th className="p-3">Teléfono</th><th className="p-3">Acciones</th></tr></thead>
                <tbody>
                    {clients.map(client => (
                    <tr key={client.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{client.nombre}</td>
                        <td className="p-3">{client.direccion}</td>
                        <td className="p-3">{client.email}</td>
                        <td className="p-3">{client.telefono}</td>
                        <td className="p-3 flex items-center gap-4">
                            <button onClick={() => openModalForEdit(client)} className="text-slate-500 hover:text-primary"><Pencil size={18}/></button>
                            <button onClick={() => handleDeleteClient(client)} className="text-slate-500 hover:text-red-600"><Trash2 size={18}/></button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
          </div>
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">{editingClient ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}</h2>
                    <form onSubmit={handleFormSubmit} className="grid grid-cols-1 gap-5">
                        <input required className="p-3 border rounded-lg" name="nombre" placeholder="Nombre del cliente o empresa" defaultValue={editingClient?.nombre || ''} />
                        <input className="p-3 border rounded-lg" name="direccion" placeholder="Dirección (opcional)" defaultValue={editingClient?.direccion || ''} />
                        <input className="p-3 border rounded-lg" name="email" type="email" placeholder="Email (opcional)" defaultValue={editingClient?.email || ''} />
                        <input className="p-3 border rounded-lg" name="telefono" placeholder="Teléfono (opcional)" defaultValue={editingClient?.telefono || ''} />
                        <div className="flex justify-end gap-4 mt-4">
                            <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
                            <Button type="submit">Guardar</Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
}
