import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import PropertyDetailView from './PropertyDetailView';
import { usePropertyTypes } from '../../../hooks/usePropertyTypes';
interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  property_type: string;
  surface_area: number;
  bedrooms?: number;
  bathrooms?: number;
  monthly_rent?: number;
  price?: number;
  operation_type?: string; // Type d'opération (sale, rental, short-term-rental)
  status: 'available' | 'rented' | 'maintenance' | 'active' | 'inactive' | 'sold' | 'draft';
  dbStatus: 'active' | 'inactive' | 'sold' | 'rented' | 'draft'; // Statut réel dans la base de données
  tenant_id?: string;
  tenant_name?: string;
  lease_start?: string;
  lease_end?: string;
  hasActiveLease?: boolean; // Indicateur si le bien a un bail actif
  created_at: string;
}

interface PropertiesTabProps {
  propertyId?: string | null;
}

export default function PropertiesTab({ propertyId }: PropertiesTabProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [cityNamesMap, setCityNamesMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadProperties();
    }
  }, [userId]);

  // Ouvrir automatiquement PropertyDetailView si propertyId est fourni
  useEffect(() => {
    if (propertyId && properties.length > 0) {
      const property = properties.find(p => p.id === propertyId);
      if (property) {
        setViewingProperty(property);
      }
    }
  }, [propertyId, properties]);

  const loadUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadProperties = async () => {
    try {
      setLoading(true);
      
      // Charger les biens et les baux en parallèle pour améliorer les performances
      const [propertiesResult, leasesResult] = await Promise.all([
        supabase
          .from('properties_02')
          .select('id, title, address, city, property_type, surface_area, bedrooms, bathrooms, price, operation_type, status, created_at')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('leases')
          .select('property_id, tenant_id, start_date, end_date, status')
          .eq('owner_id', userId)
          .in('status', ['active', 'pending_signature'])
      ]);

      if (propertiesResult.error) throw propertiesResult.error;
      const propertiesData = propertiesResult.data || [];
      const leasesData = leasesResult.data || [];

      // Charger les informations des locataires uniquement si nécessaire
      const tenantIds = [...new Set(leasesData.map((lease: any) => lease.tenant_id).filter(Boolean))];
      let tenantsMap = new Map();
      
      if (tenantIds.length > 0) {
        try {
          // Filtrer les IDs pour s'assurer qu'ils sont valides (UUIDs)
          const validTenantIds = tenantIds.filter((id: string) => {
            // Vérifier que c'est un UUID valide (format basique)
            return id && typeof id === 'string' && id.length === 36;
          });

          if (validTenantIds.length > 0) {
            const { data: tenantsData, error: tenantsError } = await supabase
              .from('tenants')
              .select('id, first_name, last_name')
              .in('id', validTenantIds);

            if (tenantsError) {
              console.error('Erreur lors du chargement des locataires:', tenantsError);
              // Continuer sans les informations des locataires plutôt que d'échouer complètement
            } else if (tenantsData) {
              tenantsData.forEach((tenant: any) => {
                // Construire le nom complet à partir de first_name et last_name
                const fullName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.trim() || 'Locataire inconnu';
                tenantsMap.set(tenant.id, {
                  ...tenant,
                  full_name: fullName
                });
              });
            }
          }
        } catch (error) {
          console.error('Erreur lors du chargement des locataires:', error);
          // Continuer sans les informations des locataires plutôt que d'échouer complètement
        }
      }

      // Créer une map des baux par property_id avec les informations du locataire
      const leasesMap = new Map();
      (leasesData || []).forEach((lease: any) => {
        const propId = lease.property_id;
        const tenant = tenantsMap.get(lease.tenant_id);
        
        if (!leasesMap.has(propId)) {
          leasesMap.set(propId, []);
        }
        leasesMap.get(propId).push({
          ...lease,
          tenant: tenant || null
        });
      });

      // Charger les noms de villes depuis localities pour toutes les villes uniques
      const uniqueCities = [...new Set(propertiesData.map((p: any) => p.city).filter(Boolean))];
      const cityNames = new Map<string, string>();
      
      await Promise.all(
        uniqueCities.map(async (city: string) => {
          try {
            const { data, error } = await supabase
              .from('localities')
              .select('villes')
              .eq('commune', city)
              .limit(1)
              .maybeSingle();
            
            if (!error && data && data.villes) {
              cityNames.set(city, data.villes);
            } else {
              cityNames.set(city, city); // Fallback sur la commune
            }
          } catch (error) {
            cityNames.set(city, city); // Fallback sur la commune en cas d'erreur
          }
        })
      );
      
      setCityNamesMap(cityNames);

      // Transformer les données properties_02 pour correspondre à l'interface
      const transformedProperties: Property[] = propertiesData.map((prop: any) => {
        // Trouver le bail actif ou en attente de signature s'il existe
        const propertyLeases = leasesMap.get(prop.id) || [];
        const activeLease = propertyLeases.find((lease: any) => {
          // Un bail est considéré comme actif s'il est 'active' ou 'pending_signature'
          if (lease.status === 'active' || lease.status === 'pending_signature') {
            if (!lease.start_date) return false;
            if (!lease.end_date) return true;
            return new Date(lease.end_date) > new Date();
          }
          return false;
        });
        
        // Déterminer le statut pour les biens
        let status: Property['status'] = 'available';
        if (prop.status === 'draft') {
          status = 'draft';
        } else if (prop.status === 'sold') {
          status = 'sold'; // Afficher comme vendu
        } else if (prop.status === 'rented' || activeLease) {
          status = 'rented';
        } else if (prop.status === 'active') {
          status = 'available';
        } else if (prop.status === 'inactive') {
          status = 'maintenance';
        }

        // Déterminer si c'est une location (rental ou short-term-rental)
        const isRental = prop.operation_type === 'rental' || prop.operation_type === 'short-term-rental';
        
        return {
          id: prop.id,
          title: prop.title,
          address: prop.address,
          city: prop.city,
          property_type: prop.property_type,
          surface_area: prop.surface_area,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          monthly_rent: isRental ? prop.price : undefined,
          price: prop.price,
          operation_type: prop.operation_type,
          status: status,
          dbStatus: prop.status, // Conserver le statut réel de la base de données
          tenant_id: activeLease?.tenant_id,
          tenant_name: activeLease?.tenant?.full_name || null,
          lease_start: activeLease?.start_date,
          lease_end: activeLease?.end_date,
          hasActiveLease: !!activeLease, // Indicateur si le bien a un bail actif
          created_at: prop.created_at,
        };
      });

      setProperties(transformedProperties);
    } catch (error) {
      console.error('Erreur lors du chargement des biens:', error);
      alert('Une erreur est survenue lors du chargement des biens');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProperty) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('properties_02')
        .delete()
        .eq('id', selectedProperty.id)
        .eq('owner_id', userId);

      if (error) throw error;

      setProperties(prev => prev.filter(p => p.id !== selectedProperty.id));
      setShowDeleteModal(false);
      setSelectedProperty(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Une erreur est survenue lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const { getPropertyTypeLabel } = usePropertyTypes();

  const getStatusLabel = (status: string) => {
    const statuses: Record<string, { label: string; color: string }> = {
      available: { label: 'Disponible', color: 'bg-green-100 text-green-700' },
      rented: { label: 'Loué', color: 'bg-blue-100 text-blue-700' },
      maintenance: { label: 'Maintenance', color: 'bg-orange-100 text-orange-700' },
      active: { label: 'Actif', color: 'bg-green-100 text-green-700' },
      inactive: { label: 'Inactif', color: 'bg-gray-100 text-gray-700' },
      sold: { label: 'Vendu', color: 'bg-purple-100 text-purple-700' },
      draft: { label: 'Brouillon', color: 'bg-yellow-100 text-yellow-700' },
    };
    return statuses[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = 
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Adapter le filtre de statut pour correspondre aux différents statuts possibles
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'available') {
        // Exclure les brouillons et les biens vendus des biens disponibles
        const isAvailable = property.status === 'available' || property.status === 'active';
        const isNotDraft = property.dbStatus !== 'draft';
        const isNotSold = property.dbStatus !== 'sold' && property.status !== 'sold';
        matchesStatus = isAvailable && isNotDraft && isNotSold;
      } else if (statusFilter === 'rented') {
        matchesStatus = property.status === 'rented';
      } else if (statusFilter === 'maintenance') {
        matchesStatus = property.status === 'maintenance' || property.status === 'inactive';
      } else if (statusFilter === 'draft') {
        matchesStatus = property.status === 'draft' || property.dbStatus === 'draft';
      } else if (statusFilter === 'sold') {
        matchesStatus = property.dbStatus === 'sold' || property.status === 'sold';
      } else {
        matchesStatus = property.status === statusFilter;
      }
    }
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: properties.length,
    available: properties.filter(p => {
      const isAvailable = p.status === 'available' || p.status === 'active';
      const isNotDraft = p.dbStatus !== 'draft' && p.status !== 'draft';
      const isNotSold = p.dbStatus !== 'sold' && p.status !== 'sold';
      return isAvailable && isNotDraft && isNotSold;
    }).length,
    rented: properties.filter(p => p.status === 'rented').length,
    maintenance: properties.filter(p => p.status === 'maintenance' || p.status === 'inactive').length,
    draft: properties.filter(p => p.status === 'draft' || p.dbStatus === 'draft').length,
    sold: properties.filter(p => p.dbStatus === 'sold' || p.status === 'sold').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="ri-loader-4-line text-5xl text-teal-600 animate-spin"></i>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Afficher la vue détaillée si une propriété est sélectionnée
  if (viewingProperty) {
    return (
      <PropertyDetailView
        property={{
          id: viewingProperty.id,
          title: viewingProperty.title,
          description: '', // Sera chargé dans PropertyDetailView
          price: viewingProperty.price || viewingProperty.monthly_rent || 0,
          offer_type: viewingProperty.operation_type === 'sale' ? 'sale' : 'rental', // Conversion pour PropertyDetailView
          property_type: viewingProperty.property_type,
          address: viewingProperty.address,
          city: viewingProperty.city,
          surface_area: viewingProperty.surface_area,
          bedrooms: viewingProperty.bedrooms,
          bathrooms: viewingProperty.bathrooms,
          status: (viewingProperty.status === 'draft' ? 'inactive' : viewingProperty.status) as 'available' | 'rented' | 'maintenance' | 'active' | 'inactive' | 'sold',
          owner_id: userId,
        }}
        onBack={() => {
          setViewingProperty(null);
          // Nettoyer le paramètre property de l'URL
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('property');
          setSearchParams(newParams);
        }}
      />
    );
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8">
        <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border-2 border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs md:text-sm font-medium">Total</span>
            <i className="ri-building-line text-lg md:text-xl lg:text-2xl text-gray-400 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
          </div>
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs md:text-sm font-medium">Disponibles</span>
            <i className="ri-checkbox-circle-line text-lg md:text-xl lg:text-2xl text-green-600 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
          </div>
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-green-600">{stats.available}</div>
        </div>
        <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs md:text-sm font-medium">Loués</span>
            <i className="ri-home-smile-line text-lg md:text-xl lg:text-2xl text-blue-600 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
          </div>
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-blue-600">{stats.rented}</div>
        </div>
        <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border-2 border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs md:text-sm font-medium">Maintenance</span>
            <i className="ri-tools-line text-lg md:text-xl lg:text-2xl text-orange-600 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
          </div>
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-orange-600">{stats.maintenance}</div>
        </div>
        <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs md:text-sm font-medium">Brouillons</span>
            <i className="ri-file-edit-line text-lg md:text-xl lg:text-2xl text-yellow-600 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
          </div>
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-yellow-600">{stats.draft}</div>
        </div>
        <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-5 lg:p-6 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-xs md:text-sm font-medium">Vendus</span>
            <i className="ri-checkbox-circle-line text-lg md:text-xl lg:text-2xl text-purple-600 w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
          </div>
          <div className="text-xl md:text-2xl lg:text-3xl font-bold text-purple-600">{stats.sold}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-lg md:rounded-xl p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="flex-1">
            <div className="relative">
              <i className="ri-search-line absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un bien..."
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 md:px-4 py-2.5 md:py-3 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="available">Disponible</option>
            <option value="rented">Loué</option>
            <option value="maintenance">Maintenance</option>
            <option value="draft">Brouillon</option>
            <option value="sold">Vendu</option>
          </select>
          <a
            href="/deposer-annonce"
            className="flex items-center justify-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
            <span className="hidden sm:inline">Ajouter un bien</span>
            <span className="sm:hidden">Ajouter</span>
          </a>
        </div>
      </div>

      {/* Properties List */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-lg md:rounded-xl p-8 md:p-12 text-center">
          <i className="ri-building-line text-4xl md:text-5xl lg:text-6xl text-gray-300 mb-3 md:mb-4"></i>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Aucun bien trouvé</h3>
          <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Aucun bien ne correspond à vos critères de recherche'
              : 'Commencez par ajouter votre premier bien locatif'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <a
              href="/deposer-annonce"
              className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-teal-600 text-white rounded-lg md:rounded-xl text-sm md:text-base font-semibold hover:bg-teal-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-add-line text-lg md:text-xl w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
              Ajouter un bien
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {filteredProperties.map((property) => {
            const statusInfo = getStatusLabel(property.status);
            return (
              <div
                key={property.id}
                onClick={() => {
                  setViewingProperty(property);
                  // Mettre à jour l'URL avec le paramètre property
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('property', property.id);
                  setSearchParams(newParams);
                }}
                className="bg-white rounded-lg md:rounded-xl p-4 md:p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-3">
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 break-words">{property.title}</h3>
                      <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-semibold ${statusInfo.color} flex-shrink-0`}>
                        {statusInfo.label}
                      </span>
                      
                      <span className="px-2 md:px-3 py-0.5 md:py-1 bg-gray-100 text-gray-700 text-[10px] md:text-xs font-semibold rounded-full flex-shrink-0">
                        {getPropertyTypeLabel(property.property_type)}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs md:text-sm mb-2 md:mb-3 flex items-center gap-2">
                      <i className="ri-map-pin-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center flex-shrink-0"></i>
                      <span className="truncate">
                        {cityNamesMap.get(property.city) || property.city}
                        {property.address && `, ${property.address}`}
                      </span>
                    </p>
                    <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
                      <div className="flex items-center gap-1">
                        <i className="ri-ruler-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                        {property.surface_area} m²
                      </div>
                      {property.bedrooms && (
                        <div className="flex items-center gap-1">
                          <i className="ri-hotel-bed-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                          {property.bedrooms} chambres
                        </div>
                      )}
                      {property.bathrooms && (
                        <div className="flex items-center gap-1">
                          <i className="ri-drop-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                          {property.bathrooms} salles de bain
                        </div>
                      )}
                    </div>
                    {property.status === 'rented' && property.tenant_name && (
                      <div className="flex items-center gap-2 text-xs md:text-sm text-blue-600 bg-blue-50 px-2 md:px-3 py-1.5 md:py-2 rounded-lg inline-flex mb-2">
                        <i className="ri-user-line w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                        <span className="truncate">Locataire: {property.tenant_name}</span>
                      </div>
                    )}
                    {property.operation_type && (
                      <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500 mt-2">
                        <span className={`px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium ${
                          property.operation_type === 'rental' || property.operation_type === 'short-term-rental'
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {property.operation_type === 'short-term-rental' 
                            ? 'Location courte durée' 
                            : property.operation_type === 'rental' 
                            ? 'Location'
                            : property.operation_type === 'sale'
                            ? 'Vente'
                            : property.operation_type}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-left md:text-right flex-shrink-0">
                    <div className="text-xl md:text-2xl font-bold text-teal-600 mb-1">
                      {property.monthly_rent 
                        ? formatPrice(property.monthly_rent)
                        : property.price 
                        ? formatPrice(property.price)
                        : 'N/A'}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
                      {property.operation_type === 'short-term-rental' 
                        ? 'par nuit' 
                        : property.operation_type === 'rental' || property.monthly_rent 
                        ? 'par mois' 
                        : property.operation_type === 'sale' 
                        ? 'prix de vente' 
                        : ''}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Bouton Vendu/Non vendu uniquement pour les biens en vente */}
                      {property.operation_type === 'sale' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation(); // Empêcher l'ouverture des détails
                            try {
                              setActionLoading(true);
                              const currentDbStatus = property.dbStatus || property.status;
                              const newStatus = currentDbStatus === 'sold' ? 'active' : 'sold';
                              
                              const { error } = await supabase
                                .from('properties_02')
                                .update({ status: newStatus })
                                .eq('id', property.id)
                                .eq('owner_id', userId);

                              if (error) {
                                console.error('Erreur détaillée:', error);
                                throw error;
                              }

                              await loadProperties();
                            } catch (err: any) {
                              console.error('Erreur lors de la mise à jour du statut:', err);
                              alert(`Erreur lors de la mise à jour du statut: ${err.message || 'Erreur inconnue'}`);
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          disabled={actionLoading}
                          className={`flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-md md:rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm font-medium whitespace-nowrap ${
                            property.dbStatus === 'sold' || property.status === 'sold'
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {property.dbStatus === 'sold' || property.status === 'sold' ? (
                            <>
                              <i className="ri-checkbox-circle-line text-sm md:text-base w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                              <span className="hidden sm:inline">Non vendu</span>
                              <span className="sm:hidden">Non vendu</span>
                            </>
                          ) : (
                            <>
                              <i className="ri-checkbox-blank-circle-line text-sm md:text-base w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                              <span className="hidden sm:inline">Marquer vendu</span>
                              <span className="sm:hidden">Vendu</span>
                            </>
                          )}
                        </button>
                      )}
                      
                      {/* Bouton de publication/retrait - Caché pour les brouillons et les biens en vente */}
                      {property.dbStatus !== 'draft' && property.status !== 'draft' && property.operation_type !== 'sale' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation(); // Empêcher l'ouverture des détails
                            try {
                              setActionLoading(true);
                              // Utiliser le statut réel de la base de données
                              const currentDbStatus = property.dbStatus || property.status;
                              const newStatus = currentDbStatus === 'inactive' ? 'active' : 'inactive';
                              
                              const { error } = await supabase
                                .from('properties_02')
                                .update({ status: newStatus })
                                .eq('id', property.id)
                                .eq('owner_id', userId);

                              if (error) {
                                console.error('Erreur détaillée:', error);
                                throw error;
                              }

                              await loadProperties();
                            } catch (err: any) {
                              console.error('Erreur lors de la mise à jour du statut:', err);
                              alert(`Erreur lors de la mise à jour du statut: ${err.message || 'Erreur inconnue'}`);
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          disabled={actionLoading}
                          className={`flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-md md:rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm font-medium whitespace-nowrap ${
                            property.dbStatus === 'inactive' || property.status === 'inactive' || property.status === 'maintenance'
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          }`}
                        >
                          {property.dbStatus === 'inactive' || property.status === 'inactive' || property.status === 'maintenance' ? (
                            <>
                              <i className="ri-eye-line text-sm md:text-base w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                              <span className="hidden sm:inline">Publier</span>
                              <span className="sm:hidden">Publier</span>
                            </>
                          ) : (
                            <>
                              <i className="ri-eye-off-line text-sm md:text-base w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                              <span className="hidden sm:inline">Retirer</span>
                              <span className="sm:hidden">Retirer</span>
                            </>
                          )}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Empêcher l'ouverture des détails
                          navigate(`/deposer-annonce?edit=${property.id}`);
                        }}
                        className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 bg-teal-600 text-white rounded-md md:rounded-lg hover:bg-teal-700 transition-colors cursor-pointer"
                        title="Modifier"
                      >
                        <i className="ri-edit-line text-base md:text-lg w-4 h-4 md:w-5 md:h-5 flex items-center justify-center"></i>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Empêcher l'ouverture des détails
                          setSelectedProperty(property);
                          setShowDeleteModal(true);
                        }}
                        className="flex items-center justify-center w-10 h-10 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <i className="ri-delete-bin-line text-lg w-5 h-5 flex items-center justify-center"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-[500px] w-full p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ri-delete-bin-line text-3xl text-red-600 w-8 h-8 flex items-center justify-center"></i>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">
              Supprimer ce bien ?
            </h3>
            <p className="text-gray-600 text-center mb-8">
              Cette action est irréversible. Le bien "{selectedProperty.title}" sera définitivement supprimé.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedProperty(null);
                }}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin w-5 h-5 flex items-center justify-center"></i>
                    Suppression...
                  </>
                ) : (
                  'Supprimer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
