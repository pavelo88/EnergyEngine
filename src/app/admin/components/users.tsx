'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { useAdminHeader } from './AdminHeaderContext';

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

  const openModalForCreate = () => {
    setEditingUser(null);
    reset({ nombre: '', dni: '', email: '', roles: [], firmaUrl: '' });
    setIsModalOpen(true);
  };

  const headerAction = useMemo(() => (
    <Button onClick={openModalForCreate} className="rounded-xl font-bold uppercase text-xs tracking-widest bg-primary text-white">
      <UserPlus className="h-4 w-4 mr-2"/>
      <span>Añadir Usuario</span>
    </Button>
  ), []);

  useAdminHeader('Gestión de Usuarios', headerAction);

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
    <div className="animate-in fade-in duration-500">
      {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-slate-100 p-8 overflow-x-auto shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                  <th className="pb-4">Nombre y Correo</th>
                  <th className="pb-4">Identificación</th>
                  <th className="pb-4">Roles Asignados</th>
                  <th className="pb-4">Estado</th>
                  <th className="pb-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4">
                      <div className="font-black text-slate-700">{user.nombre}</div>
                      <div className="text-xs font-medium text-slate-400">{user.email}</div>
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">{user.dni}</td>
                    <td className="py-4 text-xs font-black text-primary capitalize tracking-tighter">{user.roles.join(', ')}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 text-[10px] font-black rounded-full uppercase tracking-tighter ${user.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModalForEdit(user)} className="p-2 text-slate-300 hover:text-primary transition-colors"><Edit className="h-4 w-4"/></button>
                        <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (<tr><td colSpan={5} className="py-10 text-center text-slate-400 font-bold uppercase text-xs">No hay usuarios en la base de datos.</td></tr>)}
              </tbody>
            </table>
          </div>
        )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg animate-in zoom-in duration-200">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{editingUser ? 'Actualizar Usuario' : 'Nuevo Registro de Usuario'}</h2>
                <button type="button" onClick={closeModal} className="p-2 rounded-full hover:bg-slate-50 text-slate-400"><X className="h-5 w-5"/></button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <InputField id="nombre" label="Nombre Completo" register={register('nombre')} error={errors.nombre} icon={User} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField id="dni" label="DNI / Pasaporte" register={register('dni')} error={errors.dni} icon={User} />
                  <InputField id="email" label="Correo Electrónico" type="email" register={register('email')} error={errors.email} icon={User} />
                </div>
                <div>
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Roles en Plataforma</Label>
                  <div className="flex gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <CheckboxField id="role-admin" label="Administrador" value="admin" register={register('roles')} />
                    <CheckboxField id="role-inspector" label="Inspector Técnico" value="inspector" register={register('roles')} />
                  </div>
                  {errors.roles && <p className="mt-2 text-xs text-red-600 font-bold uppercase">{errors.roles.message}</p>}
                </div>
                {selectedRoles.includes('inspector') && (
                  <InputField id="firmaUrl" label="Enlace de Firma Digital" register={register('firmaUrl')} error={errors.firmaUrl} icon={LinkIcon} placeholder="https://..." />
                )}
              </div>
              <div className="p-8 bg-slate-50 flex justify-end gap-3 rounded-b-[2.5rem]">
                <Button type="button" variant="ghost" onClick={closeModal} className="rounded-xl font-bold uppercase text-xs">Cancelar</Button>
                <Button type="submit" className="rounded-xl font-black uppercase text-xs bg-primary px-8">{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const InputField = ({ id, label, type = 'text', register, error, icon: Icon, ...props }: any) => (
    <div className='space-y-2'>
        <Label htmlFor={id} className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</Label>
        <div className="relative">
            {Icon && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4"><Icon className="h-4 w-4 text-slate-300" /></div>}
            <Input id={id} type={type} {...register} {...props} className={cn("rounded-xl border-slate-100 bg-slate-50 focus:bg-white font-bold h-12 text-slate-900", Icon ? 'pl-11' : 'pl-4')} />
        </div>
        {error && <p className="mt-1 text-xs text-red-600 font-bold uppercase">{error.message}</p>}
    </div>
);

const CheckboxField = ({ id, label, value, register }: any) => (
    <div className="flex items-center gap-3">
        <Checkbox id={id} value={value} {...register} className="rounded-md border-slate-300 data-[state=checked]:bg-primary" />
        <Label htmlFor={id} className="text-xs font-black text-slate-600 uppercase tracking-tighter cursor-pointer">{label}</Label>
    </div>
);
