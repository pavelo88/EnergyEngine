'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"; 
import { useFirestore } from '@/firebase';
import { PlusCircle, Trash2, Pencil, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

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
    <div className="space-y-8">
        <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Gestión de Clientes</h1>
              <p className="mt-1 text-slate-600">Añade, edita o elimina clientes de la base de datos.</p>
            </div>
            <Button onClick={openModalForAdd}>
                <PlusCircle className="mr-2" size={20}/>
                Añadir Cliente
            </Button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          {loading ? <p>Cargando...</p> : (
            <>
              {/* VISTA DE TARJETAS PARA MÓVIL Y TABLET */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                {clients.map(client => (
                  <Card key={client.id} className="rounded-[2rem] p-6 space-y-4 flex flex-col">
                    <div className="flex-grow space-y-3">
                      <h3 className="font-bold text-lg text-slate-800">{client.nombre}</h3>
                      <div className="space-y-2 text-sm text-slate-500">
                        {client.direccion && <p className="flex items-center gap-2"><MapPin size={14} /> {client.direccion}</p>}
                        {client.email && <p className="flex items-center gap-2"><Mail size={14} /> {client.email}</p>}
                        {client.telefono && <p className="flex items-center gap-2"><Phone size={14} /> {client.telefono}</p>}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t pt-4">
                        <Button variant="ghost" size="icon" onClick={() => openModalForEdit(client)}><Pencil size={18}/></Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteClient(client)}><Trash2 size={18}/></Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* VISTA DE TABLA PARA ESCRITORIO */}
              <div className="hidden lg:block overflow-x-auto">
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
              </div>
            </>
          )}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">{editingClient ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}</h2>
                    <form onSubmit={handleFormSubmit} className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre del cliente o empresa</Label>
                            <Input required id="nombre" name="nombre" placeholder="Nombre del cliente o empresa" defaultValue={editingClient?.nombre || ''} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="direccion">Dirección</Label>
                            <Input id="direccion" name="direccion" placeholder="Dirección (opcional)" defaultValue={editingClient?.direccion || ''} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="Email (opcional)" defaultValue={editingClient?.email || ''} />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="telefono">Teléfono</Label>
                            <Input id="telefono" name="telefono" placeholder="Teléfono (opcional)" defaultValue={editingClient?.telefono || ''} />
                        </div>

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
