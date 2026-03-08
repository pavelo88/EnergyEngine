'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons';
import { Loader2, AlertCircle, Database } from 'lucide-react';
import Link from 'next/link';

const initialUsersData = [
    { nombre: 'Carlos Esteban Amarilla Bogado', dni: '70287885-T', email: 'carlosamarilla@energyengine.es', roles: ['inspector'], firmaUrl: '' },
    { nombre: 'Antonio Ugena Del Cerro', dni: '50475775-K', email: 'antoniougena@energyengine.es', roles: ['inspector'], firmaUrl: '' },
    { nombre: 'Mocanu Baluta', dni: 'X4266252-M', email: 'mocanubaluta@energyengine.es', roles: ['inspector'], firmaUrl: '' },
    { nombre: 'Juan Carlos Cabral', dni: 'X-6112156-K', email: 'juancabral@energyengine.es', roles: ['inspector'], firmaUrl: '' },
    { nombre: 'Pablo Garcia Flores', dni: 'Admin123', email: 'pablofgarciaf@gmail.com', roles: ['inspector'], firmaUrl: '' },
    { nombre: 'Pruebas 123', dni: 'Pruebas123', email: 'admin@energyengine.es', roles: ['admin', 'inspector'], firmaUrl: '' }
];

export default function AdminLoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      const checkUserRole = async () => {
        if (user && user.email && firestore && auth) {
          try {
            const userDocRef = doc(firestore, 'usuarios', user.email);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists() && userDocSnap.data().roles?.includes('admin')) {
              router.push('/admin');
            } else {
              // User is not an admin or document doesn't exist, so sign them out.
              await auth.signOut();
              setError("No tienes permisos de administrador o tu usuario no fue encontrado.");
            }
          } catch (e) {
            console.error("Error checking admin role:", e);
            await auth.signOut();
            setError("Ocurrió un error al verificar tus permisos.");
          }
        }
      };
      checkUserRole();
    }
  }, [user, isUserLoading, router, firestore, auth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email || !password) {
      setError("El correo y la contraseña no pueden estar vacíos.");
      setLoading(false);
      return;
    }
    
    if (!auth || !firestore) {
      setError("Servicios de Firebase no disponibles.");
      setLoading(false);
      return;
    }

    try {
      // 1. Try to sign in normally
      await signInWithEmailAndPassword(auth, email, password);
      // On success, the useEffect hook will redirect to /admin
    } catch (authError: any) {
      // 2. If sign-in fails (e.g., user not found in Auth), try DNI/first-login flow
      if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found') {
        try {
          // Check Firestore for a user matching email and DNI (password)
          const q = query(
            collection(firestore, 'usuarios'),
            where('email', '==', email),
            where('dni', '==', password)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            // User found in DB, attempt to create them in Auth, which also signs them in
            await createUserWithEmailAndPassword(auth, email, password);
            // On success, the useEffect will handle redirection.
          } else {
            // No user found with those credentials in DB either
            setError('Credenciales incorrectas. Verifica tu correo y contraseña/DNI.');
          }
        } catch (creationError: any) {
           // Handle specific errors during the creation attempt
           if (creationError.code === 'auth/email-already-in-use') {
             setError('Este correo ya está registrado, pero la contraseña es incorrecta. Si ya estableciste una clave personal, úsala.');
          } else if (creationError.code === 'auth/weak-password') {
            setError('La contraseña (DNI) es demasiado débil. Debe tener al menos 6 caracteres.');
          } else if (creationError.code === 'auth/invalid-email') {
            setError('El formato del correo electrónico no es válido.');
          } else {
            console.error("Firestore query or Auth creation error:", creationError);
            setError('Error al consultar la base de datos o crear el usuario.');
          }
        }
      } else if (authError.code === 'auth/invalid-email') {
        setError('El formato del correo electrónico no es válido.');
      } else if (authError.code === 'auth/wrong-password') {
        setError('La contraseña es incorrecta. Por favor, inténtalo de nuevo.');
      } else {
        console.error("Authentication error:", authError);
        setError('Ha ocurrido un error inesperado durante el inicio de sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (!firestore) return;
    if (!window.confirm('Esto borrará los usuarios existentes y cargará la lista inicial de usuarios. ¿Estás seguro?')) return;
    setSeeding(true);
    try {
        const querySnapshot = await getDocs(collection(firestore, 'usuarios'));
        const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        const createPromises = initialUsersData.map(userData => {
            const userDocRef = doc(firestore, 'usuarios', userData.email);
            return setDoc(userDocRef, {
                ...userData,
                activo: true,
                forcePasswordChange: true,
            });
        });
        await Promise.all(createPromises);

        alert('¡Base de datos cargada! Ahora puedes iniciar sesión con un usuario administrador (p. ej., admin@energyengine.es con contraseña Pruebas123).');
    } catch (error) {
        console.error("Error al cargar los datos: ", error);
        alert('Hubo un error al cargar los datos. Revisa la consola.');
    } finally {
        setSeeding(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-2xl rounded-2xl shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto mb-2 flex justify-center">
              <Logo />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Módulo Administrativo</CardTitle>
            <CardDescription>Introduce tus credenciales de administrador.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@energyengine.es"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña o DNI</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}
              <Button type="submit" className="w-full font-bold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
              </Button>
              <div className="pt-2 text-center text-sm">
                <Link href="/auth/inspection" className="underline text-muted-foreground hover:text-primary">
                  Ir al Módulo de Inspectores
                </Link>
              </div>
            </form>

            <div className="mt-6 border-t pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                Si es la primera vez que usas la aplicación o no puedes entrar, carga los usuarios iniciales.
                </p>
                <Button onClick={handleSeedDatabase} variant="outline" disabled={seeding || loading}>
                {seeding ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Database className="h-5 w-5 mr-2" />}
                <span>{seeding ? 'Cargando...' : 'Cargar Datos Iniciales'}</span>
              </Button>
            </div>

          </CardContent>
        </Card>
    </div>
  );
}
