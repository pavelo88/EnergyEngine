'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit, Trash2, UserPlus, Loader2, X, Link as LinkIcon, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

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
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestión de Usuarios</h1>
          <p className="mt-1 text-slate-600">Crea, edita y gestiona los usuarios del sistema.</p>
        </div>
        <Button onClick={openModalForCreate}>
          <UserPlus className="h-5 w-5 mr-2"/>
          <span>Añadir Usuario</span>
        </Button>
      </div>

      {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-x-auto">
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="p-6 border-b"><div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2><button type="button" onClick={closeModal} className="p-1 rounded-full hover:bg-slate-100"><X className="h-5 w-5"/></button></div></div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <InputField id="nombre" label="Nombre Completo" register={register('nombre')} error={errors.nombre} icon={User} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><InputField id="dni" label="Identificación (DNI)" register={register('dni')} error={errors.dni} icon={User} /><InputField id="email" label="Correo Electrónico" type="email" register={register('email')} error={errors.email} icon={User} /></div>
                <div>
                  <Label className="block text-sm font-medium text-slate-700 mb-2">Roles</Label>
                  <div className="flex gap-4"><CheckboxField id="role-admin" label="Admin" value="admin" register={register('roles')} /><CheckboxField id="role-inspector" label="Inspector" value="inspector" register={register('roles')} /></div>
                  {errors.roles && <p className="mt-2 text-sm text-red-600">{errors.roles.message}</p>}
                </div>
                {selectedRoles.includes('inspector') && (<InputField id="firmaUrl" label="URL de la Firma" register={register('firmaUrl')} error={errors.firmaUrl} icon={LinkIcon} placeholder="https://..." />)}
              </div>
              <div className="p-6 bg-slate-50 rounded-b-lg flex justify-end gap-3"><Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button><Button type="submit">{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const InputField = ({ id, label, type = 'text', register, error, icon: Icon, ...props }: any) => (
    <div className='space-y-2'>
        <Label htmlFor={id} className="font-medium text-slate-700">{label}</Label>
        <div className="relative">
            {Icon && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Icon className="h-5 w-5 text-slate-400" /></div>}
            <Input id={id} type={type} {...register} {...props} className={cn(Icon ? 'pl-10' : 'pl-4')} />
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error.message}</p>}
    </div>
);

const CheckboxField = ({ id, label, value, register }: any) => (
    <div className="flex items-center gap-2">
        <Checkbox id={id} value={value} {...register} />
        <Label htmlFor={id} className="font-medium text-slate-700">{label}</Label>
    </div>
);
