'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, FirebaseClientProvider } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export default function InspectionLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isUserLoading) return;

    if (user && user.email) {
      const checkInspectorRole = async () => {
        try {
          const userDocRef = doc(db, 'usuarios', user.email!);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists() && userDocSnap.data().roles?.includes('inspector')) {
            setIsAuthorized(true);
          } else {
            await auth.signOut();
            router.push('/auth/inspection');
          }
        } catch (error) {
            console.error("Error al verificar el rol del inspector:", error);
            await auth.signOut();
            router.push('/auth/inspection');
        }
      };
      checkInspectorRole();
    } else {
      router.push('/auth/inspection');
    }
  }, [user, isUserLoading, router, auth]);

  if (isUserLoading || !isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
