import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Property {
  id: string;
  title: string;
  city: string;
  property_type: string;
  offer_type: string;
  operation_type?: string;
  price: number;
  status: string;
  owner_id: string;
  created_at: string;
  owner?: {
    full_name: string | null;
    email: string;
  };
}

export default function PropertiesManagementTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, [filter]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('properties_02')
        .select('*, owner:users_2025_12_01_11_29!owner_id(full_name, email)')
        .order('created_at', { ascending: false });

      if (filter === 'approved') {
        query = query.eq('status', 'active');
      } else if (filter === 'pending') {
        query = query.eq('status', 'draft');
      }

      const { data, error } = await query;

      if (error) throw error;
      setProperties((data as any) || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des annonces:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (propertyId: string, currentStatus: boolean) => {
    try {
      setActionLoading(propertyId);
      const newStatus = currentStatus ? 'draft' : 'active';
      const { error } = await supabase
        .from('properties_02')
        .update({ status: newStatus })
        .eq('id', propertyId);

      if (error) throw error;
      await loadProperties();
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour:', err);
      alert(`Erreur: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProperties = properties.filter((property) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        property.title.toLowerCase().includes(search) ||
        property.city.toLowerCase().includes(search) ||
        property.owner?.email.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const getPropertyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      apartment: 'Appartement',
      house: 'Maison',
      villa: 'Villa',
      land: 'Terrain',
      commercial: 'Commercial',
      office: 'Bureau',
      parking: 'Parking',
    };
    return labels[type] || type;
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M FCFA`;
    }
    return `${(price / 1000).toFixed(0)}K FCFA`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <i className="ri-loader-4-line text-4xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-sm text-gray-600">Chargement des annonces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Rechercher par titre, ville ou propriétaire..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Approuvées
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              En attente ({properties.filter((p) => p.status === 'draft').length})
            </button>
          </div>
        </div>
      </div>

      {/* Liste des annonces */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Annonce
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propriétaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProperties.map((property) => (
                <tr key={property.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{property.title}</div>
                      <div className="text-sm text-gray-500">{property.city}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getPropertyTypeLabel(property.property_type)}</div>
                    <div className="text-xs text-gray-500">
                      {(property as any).operation_type === 'short-term-rental' ? 'Court terme' : property.offer_type === 'sale' ? 'Vente' : 'Location'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{formatPrice(property.price)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{property.owner?.full_name || 'Sans nom'}</div>
                    <div className="text-xs text-gray-500">{property.owner?.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          property.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : property.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : property.status === 'sold' || property.status === 'rented'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {property.status === 'active'
                          ? 'Active'
                          : property.status === 'draft'
                          ? 'Brouillon'
                          : property.status === 'sold'
                          ? 'Vendu'
                          : property.status === 'rented'
                          ? 'Loué'
                          : property.status}
                      </span>
                      {property.operation_type && (
                        <span className="text-xs text-gray-500">
                          {property.operation_type === 'short-term-rental' ? 'Court terme' : property.operation_type === 'rental' ? 'Location' : 'Vente'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleApproval(property.id, property.status === 'active')}
                        disabled={actionLoading === property.id}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          property.status === 'active'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } disabled:opacity-50`}
                      >
                        {actionLoading === property.id ? (
                          <i className="ri-loader-4-line animate-spin"></i>
                        ) : property.status === 'active' ? (
                          'Passer en brouillon'
                        ) : (
                          'Activer'
                        )}
                      </button>
                      <button
                        onClick={() => navigate(`/bien/${property.id}`)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                      >
                        Voir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProperties.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">Aucune annonce trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}

