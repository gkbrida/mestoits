import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  user_type: string;
  company_name: string | null;
}

interface UserActivityDetailProps {
  user: User;
  onClose: () => void;
}

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

export default function UserActivityDetail({ user, onClose }: UserActivityDetailProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    subscriptions: any[];
    properties: any[];
    reservationsAsOwner: any[];
    installmentPlans: any[];
    leases: any[];
    tenants: any[];
    commissions: any[];
  }>({
    subscriptions: [],
    properties: [],
    reservationsAsOwner: [],
    installmentPlans: [],
    leases: [],
    tenants: [],
    commissions: [],
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [
          subsRes,
          propsRes,
          reservRes,
          instPlansRes,
          leasesRes,
          tenantsRes,
          commissionsRes,
        ] = await Promise.all([
          supabase.from('user_subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
          supabase.from('properties_02').select('id, title, city, price, status, operation_type, created_at').eq('owner_id', user.id).order('created_at', { ascending: false }),
          supabase.from('reservations').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
          supabase.from('installment_plans').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
          supabase.from('leases').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
          supabase.from('tenants').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
          supabase.from('commissions').select('*').eq('user_id', user.id),
        ]);

        const reservations = reservRes.data || [];
        const instPlans = instPlansRes.data || [];
        const leases = leasesRes.data || [];

        const propIdsRes = [...new Set([...reservations.map((r: any) => r.property_id), ...instPlans.map((ip: any) => ip.property_id), ...leases.map((l: any) => l.property_02_id || l.property_id)].filter(Boolean))];
        let propMap: Record<string, any> = {};
        if (propIdsRes.length > 0) {
          const { data: props } = await supabase.from('properties_02').select('id, title, city').in('id', propIdsRes);
          if (props) props.forEach((p: any) => { propMap[p.id] = p; });
        }

        const subs = subsRes.data || [];
        const planIds = [...new Set(subs.map((s: any) => s.plan_id).filter(Boolean))];
        let plansMap: Record<string, any> = {};
        if (planIds.length > 0) {
          const { data: plans } = await supabase.from('subscription_plans').select('id, name, plan_type, price').in('id', planIds);
          if (plans) plans.forEach((p: any) => { plansMap[p.id] = p; });
        }

        setData({
          subscriptions: subs.map((s: any) => ({ ...s, subscription_plans: plansMap[s.plan_id] })),
          properties: propsRes.data || [],
          reservationsAsOwner: reservations.map((r: any) => ({ ...r, properties_02: propMap[r.property_id] })),
          installmentPlans: instPlans.map((ip: any) => ({ ...ip, properties_02: propMap[ip.property_id] })),
          leases: leases.map((l: any) => ({ ...l, properties_02: propMap[l.property_02_id || l.property_id] })),
          tenants: tenantsRes.data || [],
          commissions: commissionsRes.data || [],
        });
      } catch (e) {
        console.error('Erreur chargement activité utilisateur:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 text-center">
            <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
            <p className="mt-4 text-sm text-gray-600">Chargement de l'activité...</p>
          </div>
        </div>
      </div>
    );
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
        <i className="ri-folder-line"></i>
        {title}
      </h4>
      <div className="bg-gray-50 rounded-lg p-4">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Activité – {user.full_name || user.email}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
            {user.company_name && <p className="text-sm text-gray-600">{user.company_name}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <Section title="Abonnements">
            {data.subscriptions.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun abonnement</p>
            ) : (
              <ul className="space-y-2">
                {data.subscriptions.map((s: any) => (
                  <li key={s.id} className="text-sm">
                    <span className="font-medium">{(s.subscription_plans as any)?.name || s.plan_id}</span>
                    {' – '}
                    <span className="text-gray-600">{s.status}</span>
                    {' – '}
                    <span>{new Date(s.start_date).toLocaleDateString('fr-FR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Annonces (properties_02)">
            {data.properties.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune annonce</p>
            ) : (
              <ul className="space-y-2">
                {data.properties.map((p: any) => (
                  <li key={p.id} className="text-sm flex justify-between">
                    <span className="font-medium">{p.title}</span>
                    <span className="text-gray-600">{p.city} – {formatPrice(p.price)} – {p.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Réservations (propriétaire)">
            {data.reservationsAsOwner.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune réservation</p>
            ) : (
              <ul className="space-y-2">
                {data.reservationsAsOwner.map((r: any) => (
                  <li key={r.id} className="text-sm">
                    <span className="font-medium">{(r.properties_02 as any)?.title || r.property_id}</span>
                    {' – '}{r.guest_name} – {formatPrice(r.total_amount)} – {r.status}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Paiements échelonnés">
            {data.installmentPlans.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun plan</p>
            ) : (
              <ul className="space-y-2">
                {data.installmentPlans.map((ip: any) => (
                  <li key={ip.id} className="text-sm">
                    <span className="font-medium">{(ip.properties_02 as any)?.title || ip.property_id}</span>
                    {' – '}{formatPrice(ip.total_amount)} – {ip.status}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Baux">
            {data.leases.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun bail</p>
            ) : (
              <ul className="space-y-2">
                {data.leases.map((l: any) => (
                  <li key={l.id} className="text-sm">
                    <span className="font-medium">{(l.properties_02 as any)?.title || l.property_id}</span>
                    {' – '}{formatPrice(l.monthly_rent)}/mois – {l.status}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Locataires">
            {data.tenants.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun locataire</p>
            ) : (
              <ul className="space-y-2">
                {data.tenants.map((t: any) => (
                  <li key={t.id} className="text-sm">
                    {t.first_name} {t.last_name} – {t.email}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Commissions (plateforme)">
            {data.commissions.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune commission</p>
            ) : (
              <ul className="space-y-2">
                {data.commissions.map((c: any) => (
                  <li key={c.id} className="text-sm">
                    {c.transaction_type} – {formatPrice(c.commission_amount)} – {c.status}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
