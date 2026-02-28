'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Edit, Trash2, UserPlus, Loader2, AlertTriangle, X, Link as LinkIcon, Shield, User, Database } from 'lucide-react';

// --- DATOS PARA LA CARGA INICIAL ---
const initialUsersData = [
    { nombre: 'Carlos Esteban Amarilla Bogado', dni: '70287885-T', email: 'carlosamarilla@energyengine.es', roles: ['inspector'], firmaUrl: '' },
    { nombre: 'Antonio Ugena Del Cerro', dni: '50475775-K', email: 'antoniougena@energyengine.es', roles: ['inspector'], firmaUrl: '' },
    { nombre: 'Mocanu Baluta', dni: 'X4266252-M', email: 'mocanubaluta@energyengine.es', roles: ['inspector'], firmaUrl: '' },
    { nombre: 'Juan Carlos Cabral', dni: 'X-6112156-K', email: 'juancabral@energyengine.es', roles: ['inspector'], firmaUrl: '' },
    { nombre: 'Pablo Garcia Flores', dni: 'Admin123', email: 'pablofgarciaf@gmail.com', roles: ['inspector'], firmaUrl: '' },
    { nombre: 'Pruebas 123', dni: 'Pruebas123', email: 'admin@energyengine.es', roles: ['admin', 'inspector'], firmaUrl: '' }
];


// Esquema de validación para el formulario de usuario
const userSchema = z.object({
  nombre: z.string().min(3, 'El nombre es demasiado corto.'),
  dni: z.string().nonempty('La identificación es requerida.'),
  email: z.string().email('El correo electrónico no es válido.'),
  roles: z.array(z.string()).min(1, 'Se debe seleccionar al menos un rol.'),
  firmaUrl: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
});

type UserFormInputs = z.infer<typeof userSchema>;
type UserData = UserFormInputs & { id: string; activo: boolean };

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const db = useFirestore();

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UserFormInputs>({
    resolver: zodResolver(userSchema),
  });

  const selectedRoles = watch('roles') || [];

  const fetchUsers = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserData[];
      setUsers(usersData);
    } catch (error) {
      console.error("Error al cargar usuarios: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [db]);

  const handleSeedDatabase = async () => {
    if (!db) return;
    if (!window.confirm('Esto borrará los usuarios existentes y cargará la lista inicial. ¿Continuar?')) return;
    setSeeding(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      const createPromises = initialUsersData.map(userData => {
        const userDocRef = doc(db, 'usuarios', userData.email);
        return setDoc(userDocRef, {
          ...userData,
          activo: true,
          forcePasswordChange: true,
        });
      });
      await Promise.all(createPromises);

      alert('¡Base de datos de usuarios cargada con éxito!');
      fetchUsers();
    } catch (error) {
      console.error("Error al cargar los datos: ", error);
      alert('Hubo un error al cargar los datos.');
    } finally {
      setSeeding(false);
    }
  };

  const openModalForCreate = () => {
    setEditingUser(null);
    reset({ nombre: '', dni: '', email: '', roles: [], firmaUrl: '' });
    setIsModalOpen(true);
  };

  const openModalForEdit = (user: UserData) => {
    setEditingUser(user);
    reset(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const onSubmit = async (data: UserFormInputs) => {
    if (!db) return;
    try {
      if (editingUser) {
        const userDocRef = doc(db, 'usuarios', editingUser.id);
        await updateDoc(userDocRef, data);
      } else {
        const userDocRef = doc(db, 'usuarios', data.email);
        await setDoc(userDocRef, { ...data, activo: true, forcePasswordChange: true });
      }
      closeModal();
      fetchUsers();
    } catch (error) {
      console.error("Error al guardar el usuario: ", error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!db) return;
    if (window.confirm('¿Seguro que quieres eliminar este usuario?')) {
      try {
        await deleteDoc(doc(db, 'usuarios', userId));
        fetchUsers();
      } catch (error) {
        console.error("Error al eliminar el usuario: ", error);
      }
    }
  };

  return (
    <div className="bg-slate-50 p-4 sm:p-6 md:p-8 h-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Gestión de Usuarios</h1>
            <p className="mt-1 text-slate-600">Crea, edita y gestiona los usuarios del sistema.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={openModalForCreate} className="inline-flex items-center gap-2 justify-center rounded-lg bg-amber-600 px-4 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-amber-700">
              <UserPlus className="h-5 w-5"/>
              <span>Añadir</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-amber-500" /></div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100"><tr><th className="p-4 text-sm font-semibold text-slate-600">Nombre</th><th className="p-4 text-sm font-semibold text-slate-600">Identificación</th><th className="p-4 text-sm font-semibold text-slate-600">Rol</th><th className="p-4 text-sm font-semibold text-slate-600">Estado</th><th className="p-4 text-sm font-semibold text-slate-600">Acciones</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="p-4"><div className="font-medium text-slate-900">{user.nombre}</div><div className="text-sm text-slate-500">{user.email}</div></td>
                    <td className="p-4 text-slate-700">{user.dni}</td>
                    <td className="p-4 text-slate-700 capitalize">{user.roles.join(', ')}</td>
                    <td className="p-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="p-4"><div className="flex gap-2"><button onClick={() => openModalForEdit(user)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-md"><Edit className="h-4 w-4"/></button><button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-md"><Trash2 className="h-4 w-4"/></button></div></td>
                  </tr>
                ))}
                {users.length === 0 && (<tr><td colSpan={5} className="text-center p-8 text-slate-500">No hay usuarios en la base de datos.</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="p-6 border-b"><div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2><button type="button" onClick={closeModal} className="p-1 rounded-full hover:bg-slate-100"><X className="h-5 w-5"/></button></div></div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <InputField id="nombre" label="Nombre Completo" register={register('nombre')} error={errors.nombre} icon={User} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><InputField id="dni" label="Identificación (DNI)" register={register('dni')} error={errors.dni} icon={User} /><InputField id="email" label="Correo Electrónico" type="email" register={register('email')} error={errors.email} icon={User} /></div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Roles</label>
                  <div className="flex gap-4"><CheckboxField id="role-admin" label="Admin" value="admin" register={register('roles')} /><CheckboxField id="role-inspector" label="Inspector" value="inspector" register={register('roles')} /></div>
                  {errors.roles && <p className="mt-2 text-sm text-red-600">{errors.roles.message}</p>}
                </div>
                {selectedRoles.includes('inspector') && (<InputField id="firmaUrl" label="URL de la Firma" register={register('firmaUrl')} error={errors.firmaUrl} icon={LinkIcon} placeholder="https://..." />)}
              </div>
              <div className="p-6 bg-slate-50 rounded-b-2xl flex justify-end gap-3"><button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border rounded-lg hover:bg-slate-50">Cancelar</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-lg hover:bg-amber-700">{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const InputField = ({ id, label, type = 'text', register, error, icon: Icon, ...props }: any) => (<div><label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{label}</label><div className="relative">{Icon && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Icon className="h-5 w-5 text-slate-400" /></div>}<input id={id} type={type} {...register} {...props} className={`block w-full rounded-lg border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm ${Icon ? 'pl-10' : 'pl-4'}`} /></div>{error && <p className="mt-2 text-sm text-red-600">{error.message}</p>}</div>);
const CheckboxField = ({ id, label, value, register }: any) => (<div className="flex items-center"><input id={id} type="checkbox" value={value} {...register} className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" /><label htmlFor={id} className="ml-2 block text-sm text-slate-900">{label}</label></div>);
