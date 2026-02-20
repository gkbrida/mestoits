import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Reservation {
  id: string;
  property_id: string;
  owner_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  start_date: string;
  end_date: string;
  nights: number;
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  properties_02?: { title: string; address: string; city: string; price: number };
  owner?: { full_name: string | null; email: string };
}

const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  cancelled: 'Annulée',
  completed: 'Terminée',
};

export default function ShortTermRentalsTab() {
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState('');

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError('');
      const { data: rawData, error: err } = await supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;

      const data = rawData || [];
      const propertyIds = [...new Set(data.map((r: any) => r.property_id).filter(Boolean))];
      const ownerIds = [...new Set(data.map((r: any) => r.owner_id).filter(Boolean))];

      let propertiesMap: Record<string, any> = {};
      let ownersMap: Record<string, any> = {};

      if (propertyIds.length > 0) {
        const { data: props } = await supabase.from('properties_02').select('id, title, address, city, price').in('id', propertyIds);
        if (props) props.forEach((p: any) => { propertiesMap[p.id] = p; });
      }
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase.from('users_2025_12_01_11_29').select('id, full_name, email').in('id', ownerIds);
        if (owners) owners.forEach((o: any) => { ownersMap[o.id] = o; });
      }

      const enrichedData = data.map((r: any) => ({
        ...r,
        properties_02: propertiesMap[r.property_id],
        owner: ownersMap[r.owner_id],
      }));

      setReservations((enrichedData as Reservation[]) || []);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
        <p className="mt-4 text-sm text-gray-600">Chargement des réservations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Location courte durée</h3>
          <p className="text-sm text-gray-500">{reservations.length} réservation(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bien</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nuits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reservations.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{(r.properties_02 as any)?.title || '–'}</div>
                    <div className="text-xs text-gray-500">{(r.properties_02 as any)?.city || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{r.guest_name}</div>
                    <div className="text-xs text-gray-500">{r.guest_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(r.start_date).toLocaleDateString('fr-FR')} – {new Date(r.end_date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.nights}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatPrice(r.total_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        r.status === 'confirmed' || r.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : r.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {statusLabels[r.status] || r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedReservation(r)}
                      className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reservations.length === 0 && (
          <div className="text-center py-12 text-gray-500">Aucune réservation</div>
        )}
      </div>

      {/* Modal détail réservation */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedReservation(null)}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Détail de la réservation</h3>
              <button onClick={() => setSelectedReservation(null)} className="text-gray-400 hover:text-gray-600">
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <span className="font-semibold text-gray-700">ID :</span>
                <span className="ml-2 text-gray-900 font-mono">{selectedReservation.id}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Bien :</span>
                <span className="ml-2 text-gray-900">{(selectedReservation.properties_02 as any)?.title || '–'}</span>
                <div className="ml-4 text-gray-600">{(selectedReservation.properties_02 as any)?.address} – {(selectedReservation.properties_02 as any)?.city}</div>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Propriétaire :</span>
                <span className="ml-2 text-gray-900">{(selectedReservation.owner as any)?.full_name || '–'}</span>
                <span className="ml-2 text-gray-600">{(selectedReservation.owner as any)?.email}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Client :</span>
                <span className="ml-2 text-gray-900">{selectedReservation.guest_name}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Email client :</span>
                <span className="ml-2 text-gray-900">{selectedReservation.guest_email}</span>
              </div>
              {selectedReservation.guest_phone && (
                <div>
                  <span className="font-semibold text-gray-700">Téléphone client :</span>
                  <span className="ml-2 text-gray-900">{selectedReservation.guest_phone}</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-gray-700">Dates :</span>
                <span className="ml-2 text-gray-900">
                  {new Date(selectedReservation.start_date).toLocaleDateString('fr-FR')} – {new Date(selectedReservation.end_date).toLocaleDateString('fr-FR')}
                </span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Nuits :</span>
                <span className="ml-2 text-gray-900">{selectedReservation.nights}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Montant total :</span>
                <span className="ml-2 text-gray-900 font-semibold">{formatPrice(selectedReservation.total_amount)}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">Statut :</span>
                <span
                  className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedReservation.status === 'confirmed' || selectedReservation.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : selectedReservation.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {statusLabels[selectedReservation.status] || selectedReservation.status}
                </span>
              </div>
              {selectedReservation.notes && (
                <div>
                  <span className="font-semibold text-gray-700">Notes :</span>
                  <p className="mt-1 text-gray-600">{selectedReservation.notes}</p>
                </div>
              )}
              <div>
                <span className="font-semibold text-gray-700">Créée le :</span>
                <span className="ml-2 text-gray-600">{new Date(selectedReservation.created_at).toLocaleString('fr-FR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
