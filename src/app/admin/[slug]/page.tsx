'use client';

import { useParams } from 'next/navigation';
import Users from '@/app/admin/components/users';
import Clients from '@/app/admin/components/clients';
import Jobs from '@/app/admin/components/jobs';
import Expenses from '@/app/admin/components/expenses';
import Reports from '@/app/admin/components/reports';
import Import from '@/app/admin/components/import';

const componentMap: { [key: string]: React.ComponentType } = {
  users: Users,
  clients: Clients,
  jobs: Jobs,
  expenses: Expenses,
  reports: Reports,
  import: Import,
};

export default function AdminDynamicPage() {
  const params = useParams();
  const slug = params.slug as string;
  const ComponentToRender = componentMap[slug];

  if (!ComponentToRender) {
    return <div>Página no encontrada.</div>;
  }

  return <ComponentToRender />;
}
