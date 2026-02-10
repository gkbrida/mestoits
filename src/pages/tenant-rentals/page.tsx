import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useEmail } from '../../hooks/useEmail';

import Navbar from '../../components/feature/Navbar';
import Footer from '../../components/feature/Footer';
import SideMenu from '../../components/feature/SideMenu';
import RentalCard from './components/RentalCard';
import RentalDetailView from './components/RentalDetailView';
import SignatureView from './components/SignatureView';
import PaymentResult from './components/PaymentResult';

export default function TenantRentalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const { sendEmail } = useEmail();
  const [paymentResult, setPaymentResult] = useState<'success' | 'cancelled' | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Gérer le retour après paiement Stripe
  useEffect(() => {
    // Rediriger si on est sur /tenant-rentals vers /mes-locations (pour éviter les doublons)
    if (window.location.pathname === '/tenant-rentals' && !searchParams.toString()) {
      // Si pas de paramètres de paiement, rediriger vers /mes-locations
      const newUrl = window.location.origin + '/mes-locations' + window.location.search;
      console.log('🔄 Redirection de /tenant-rentals vers /mes-locations:', newUrl);
      window.history.replaceState({}, '', newUrl);
      return;
    }
    
    // Log complet de tous les paramètres de l'URL
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 RETOUR STRIPE - ANALYSE COMPLÈTE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 URL complète:', window.location.href);
    console.log('📋 URL sans paramètres:', window.location.origin + window.location.pathname);
    console.log('📋 Query string complète:', window.location.search);
    
    // Récupérer tous les paramètres
    const allParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    console.log('📋 Tous les paramètres URL:', allParams);
    
    const paymentStatus = searchParams.get('payment');
    const leaseId = searchParams.get('lease');
    const paymentId = searchParams.get('paymentId');
    const sessionId = searchParams.get('session_id'); // Stripe peut aussi envoyer session_id

    console.log('📊 Paramètres extraits:');
    console.log('   • payment:', paymentStatus);
    console.log('   • lease:', leaseId);
    console.log('   • paymentId:', paymentId);
    console.log('   • session_id:', sessionId);
    console.log('═══════════════════════════════════════════════════════');

    if (paymentStatus === 'success' && leaseId) {
      console.log('✅ PAIEMENT RÉUSSI DÉTECTÉ');
      console.log('📝 Détails du paiement:');
      console.log('   • Lease ID:', leaseId);
      console.log('   • Payment ID:', paymentId || 'Non fourni');
      console.log('   • Session ID:', sessionId || 'Non fourni');
      
      // Mettre à jour le statut du paiement dans la base de données
      if (paymentId && paymentId.trim() !== '') {
        console.log('🔄 Mise à jour du paiement avec ID:', paymentId);
        // Appeler updatePaymentStatus et attendre le résultat
        (async () => {
          try {
            await updatePaymentStatus(paymentId, 'paid');
            console.log('✅ Mise à jour du paiement terminée avec succès');
          } catch (error) {
            console.error('❌ Erreur lors de la mise à jour du paiement:', error);
            alert('Le paiement a été effectué mais une erreur est survenue lors de la mise à jour. Veuillez contacter le support.');
          }
        })();
      } else {
        console.error('❌ ERREUR CRITIQUE: Aucun paymentId fourni dans l\'URL de retour!');
        console.error('   • URL complète:', window.location.href);
        console.error('   • Paramètres:', allParams);
        alert('⚠️ Le paiement a été effectué mais l\'ID du paiement est manquant. Veuillez contacter le support avec le numéro de session Stripe: ' + (sessionId || 'Non disponible'));
      }
      
      // Afficher la page de résultat de paiement
      setPaymentResult('success');
      
      // Nettoyer les paramètres d'URL après un court délai pour permettre le traitement
      setTimeout(() => {
        console.log('🧹 Nettoyage des paramètres URL');
        setSearchParams({});
      }, 100);
    } else if (paymentStatus === 'cancelled') {
      console.log('❌ PAIEMENT ANNULÉ DÉTECTÉ');
      console.log('📝 Détails:');
      console.log('   • Lease ID:', leaseId || 'Non fourni');
      
      // Afficher la page de résultat de paiement
      setPaymentResult('cancelled');
      
      // Nettoyer les paramètres d'URL après un court délai
      setTimeout(() => {
        console.log('🧹 Nettoyage des paramètres URL');
        setSearchParams({});
      }, 100);
    } else {
      console.log('ℹ️ Aucun retour de paiement détecté ou paramètres incomplets');
      console.log('   • paymentStatus:', paymentStatus || 'Non défini');
      console.log('   • leaseId:', leaseId || 'Non défini');
    }
  }, [searchParams, setSearchParams]);

  const updatePaymentStatus = async (paymentId: string, status: string) => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 MISE À JOUR DU STATUT DU PAIEMENT');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 Paramètres reçus:');
    console.log('   • Payment ID:', paymentId);
    console.log('   • Nouveau statut:', status);
    
    try {
      // Récupérer les informations du paiement
      console.log('📥 Récupération du paiement depuis Supabase...');
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (paymentError || !paymentData) {
        console.error('❌ Erreur lors de la récupération du paiement:');
        console.error('   • Erreur:', paymentError);
        console.error('   • Données:', paymentData);
        return;
      }

      console.log('✅ Paiement trouvé dans la base de données:');
      console.log('   • ID:', paymentData.id);
      console.log('   • Lease ID:', paymentData.lease_id);
      console.log('   • Montant:', paymentData.amount);
      console.log('   • Statut actuel:', paymentData.status);
      console.log('   • Date d\'échéance:', paymentData.due_date);

      // Traiter la commission si le paiement est confirmé
      if (status === 'paid') {
        try {
          const { processCommission } = await import('../../utils/commissionUtils');
          const { data: { user } } = await supabase.auth.getUser();
          await processCommission(
            'rent_payment',
            paymentId,
            user?.id || null,
            parseFloat(paymentData.amount)
          );
        } catch (commissionError) {
          console.error('⚠️ Erreur lors du traitement de la commission:', commissionError);
          // Ne pas bloquer le processus si la commission échoue
        }
      }

      // Récupérer les informations du bail
      console.log('📥 Récupération du bail depuis Supabase...');
      console.log('   • Lease ID:', paymentData.lease_id);
      const { data: leaseData, error: leaseError } = await supabase
        .from('leases')
        .select('id, monthly_rent, property_id, tenant_id')
        .eq('id', paymentData.lease_id)
        .single();

      if (leaseError || !leaseData) {
        console.error('❌ Erreur lors de la récupération du bail:');
        console.error('   • Erreur:', leaseError);
        return;
      }

      console.log('✅ Bail trouvé:');
      console.log('   • ID:', leaseData.id);
      console.log('   • Property ID:', leaseData.property_id);
      console.log('   • Tenant ID:', leaseData.tenant_id);

      // Récupérer les informations de la propriété
      let property = null;
      if (leaseData.property_id) {
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('id, title, address, city, owner_id')
          .eq('id', leaseData.property_id)
          .single();
        
        if (!propertyError && propertyData) {
          property = propertyData;
        }
      }

      // Récupérer les informations du locataire
      // Privilégier users_2025_12_01_11_29, sinon utiliser tenants
      let tenant = null;
      if (leaseData.tenant_id) {
        // D'abord récupérer l'email depuis tenants
        const { data: tenantDataFromTenants } = await supabase
          .from('tenants')
          .select('id, email, first_name, last_name')
          .eq('id', leaseData.tenant_id)
          .single();
        
        if (tenantDataFromTenants?.email) {
          // Chercher dans users_2025_12_01_11_29 par email (priorité)
          const { data: userData } = await supabase
            .from('users_2025_12_01_11_29')
            .select('full_name, email')
            .eq('email', tenantDataFromTenants.email)
            .single();

          if (userData?.full_name) {
            // Utiliser les données de users_2025_12_01_11_29
            tenant = {
              id: tenantDataFromTenants.id,
              full_name: userData.full_name,
              email: userData.email || tenantDataFromTenants.email,
            };
          } else {
            // Fallback sur first_name + last_name de tenants
            tenant = {
              id: tenantDataFromTenants.id,
              full_name: `${tenantDataFromTenants.first_name || ''} ${tenantDataFromTenants.last_name || ''}`.trim() || 'Locataire',
              email: tenantDataFromTenants.email,
            };
          }
        } else if (tenantDataFromTenants) {
          // Pas d'email, utiliser first_name + last_name de tenants
          tenant = {
            id: tenantDataFromTenants.id,
            full_name: `${tenantDataFromTenants.first_name || ''} ${tenantDataFromTenants.last_name || ''}`.trim() || 'Locataire',
            email: tenantDataFromTenants.email || '',
          };
        }
      }

      // Mettre à jour le statut du paiement
      const paymentDate = new Date().toISOString().split('T')[0];
      console.log('💾 Mise à jour du paiement dans Supabase...');
      console.log('   • Nouveau statut:', status);
      console.log('   • Date de paiement:', paymentDate);
      console.log('   • Méthode de paiement: stripe');
      
      const { error: updateError, data: updatedData } = await supabase
        .from('payments')
        .update({ 
          status: status,
          payment_date: paymentDate,
          payment_method: 'stripe'
        })
        .eq('id', paymentId)
        .select();

      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour du paiement:');
        console.error('   • Erreur:', updateError);
        return;
      }

      console.log('✅ Paiement mis à jour avec succès dans Supabase');
      console.log('   • Données mises à jour:', updatedData);

      // Récupérer les informations du propriétaire
      if (leaseData.property_id && property && property.owner_id) {
        // Récupérer les informations de l'utilisateur propriétaire directement
        const { data: ownerUser, error: userError } = await supabase
          .from('users_2025_12_01_11_29')
          .select('id, email, full_name')
          .eq('id', property.owner_id)
          .single();

        if (!userError && ownerUser && ownerUser.email) {
          // Extraire le mois et l'année du paiement
          const paymentDate = new Date(paymentData.due_date || paymentData.created_at);
          const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 
                            'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
          const month = monthNames[paymentDate.getMonth()];
          const year = paymentDate.getFullYear();

          // Envoyer l'email au propriétaire
          console.log('═══════════════════════════════════════════════════════');
          console.log('📧 ENVOI DE L\'EMAIL AU PROPRIÉTAIRE');
          console.log('═══════════════════════════════════════════════════════');
          console.log('📧 Email du propriétaire:', ownerUser.email);
          console.log('👤 Nom du propriétaire:', ownerUser.full_name || 'Propriétaire');
          console.log('👤 Nom du locataire:', tenant?.full_name || 'Locataire');
          console.log('🏠 Propriété:', property.title);
          console.log('📅 Période:', `${month} ${year}`);
          console.log('💰 Montant:', paymentData.amount);
          console.log('💳 Méthode:', 'stripe');
          
          const emailResult = await sendEmail('loyer_paye', {
            ownerEmail: ownerUser.email,
            ownerName: ownerUser.full_name || 'Propriétaire',
            tenantName: tenant?.full_name || 'Locataire',
            propertyTitle: property.title,
            propertyAddress: property.address ? `${property.address}${property.city ? `, ${property.city}` : ''}` : undefined,
            month: month,
            year: year,
            amount: paymentData.amount,
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'stripe',
            appUrl: window.location.origin,
          });

          if (emailResult.success) {
            console.log('✅ Email envoyé au propriétaire avec succès');
            console.log('   • Message ID:', emailResult.messageId || 'Non fourni');
          } else {
            console.error('❌ Erreur lors de l\'envoi de l\'email:');
            console.error('   • Erreur:', emailResult.error);
            console.error('   • Message:', emailResult.message);
          }
          console.log('═══════════════════════════════════════════════════════');
        } else {
          console.warn('⚠️ Propriétaire non trouvé ou email manquant');
        }
      }

      // Recharger les locations pour mettre à jour l'affichage
      console.log('🔄 Rechargement des locations...');
      loadRentals();
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ MISE À JOUR TERMINÉE AVEC SUCCÈS');
      console.log('═══════════════════════════════════════════════════════');
    } catch (error) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ ERREUR LORS DE LA MISE À JOUR DU PAIEMENT');
      console.error('═══════════════════════════════════════════════════════');
      console.error('Erreur:', error);
      if (error instanceof Error) {
        console.error('   • Message:', error.message);
        console.error('   • Stack:', error.stack);
      }
      console.error('═══════════════════════════════════════════════════════');
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadRentals();
    }
  }, [userId]);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Trouver le locataire correspondant à l'utilisateur par email
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id')
          .eq('email', user.email)
          .single();
        
        if (tenantData) {
          setUserId(tenantData.id);
        } else {
          // Si pas de locataire trouvé, utiliser l'ID utilisateur directement
          // (pour compatibilité avec les anciens baux qui pourraient référencer users_2025_12_01_11_29)
          setUserId(user.id);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  const loadRentals = async () => {
    try {
      setLoading(true);
      
      // Obtenir l'utilisateur connecté pour trouver le locataire correspondant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        setRentals([]);
        setLoading(false);
        return;
      }

      // Trouver le locataire correspondant à l'utilisateur par email
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (tenantError) {
        console.error('Erreur lors de la recherche du locataire:', tenantError);
      }

      // Charger les baux pour ce locataire (si trouvé) OU pour l'utilisateur directement (compatibilité)
      let leasesData: any[] = [];
      let leasesError: any = null;

      // 1. Si un locataire est trouvé, charger les baux avec tenant_id
      if (tenantData) {
        console.log('✅ Locataire trouvé, chargement des baux avec tenant_id:', tenantData.id);
        const { data, error } = await supabase
          .from('leases')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .in('status', ['active', 'pending_signature', 'terminated'])
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Erreur lors du chargement des baux avec tenant_id:', error);
          leasesError = error;
        } else if (data) {
          leasesData = data;
        }
      }

      // 2. Aussi essayer de charger les baux avec l'ID utilisateur directement (pour compatibilité)
      // Cela permet de récupérer les anciens baux qui pourraient référencer directement l'ID utilisateur
      console.log('🔍 Recherche de baux avec user.id:', user.id);
      const { data: leasesByUserId, error: leasesByUserIdError } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', user.id)
        .in('status', ['active', 'pending_signature', 'terminated'])
        .order('created_at', { ascending: false });

      if (leasesByUserIdError) {
        console.warn('Avertissement lors du chargement des baux avec user.id:', leasesByUserIdError);
      } else if (leasesByUserId && leasesByUserId.length > 0) {
        console.log(`✅ ${leasesByUserId.length} baux trouvés avec user.id`);
        // Combiner les résultats en évitant les doublons
        const existingIds = new Set(leasesData.map(l => l.id));
        leasesByUserId.forEach((lease: any) => {
          if (!existingIds.has(lease.id)) {
            leasesData.push(lease);
          }
        });
      }

      // Si aucune erreur critique et qu'on a des données, continuer
      if (leasesError && leasesData.length === 0) {
        console.error('Erreur lors du chargement des baux:', leasesError);
        throw leasesError;
      }

      if (leasesData.length === 0) {
        console.log('ℹ️ Aucun bail trouvé pour cet utilisateur');
        setRentals([]);
        setLoading(false);
        return;
      }

      console.log(`✅ ${leasesData.length} baux chargés au total`);

      // Charger les propriétés séparément pour garantir la récupération
      // Essayer à la fois properties et properties_02
      const propertyIds = [...new Set(leasesData.map((lease: any) => lease.property_id).filter(Boolean))];
      let propertiesMap = new Map();
      
      if (propertyIds.length > 0) {
        console.log('📥 Tentative de chargement des propriétés depuis Supabase...');
        console.log(`   • ${propertyIds.length} propriétés à charger`);
        
        // Fonction helper pour charger depuis une table spécifique
        const loadPropertiesFromTable = async (tableName: string) => {
          const { data, error } = await supabase
            .from(tableName)
            .select('id, title, address, city, property_type, surface_area, bedrooms, bathrooms, images')
            .in('id', propertyIds);
          
          if (error) {
            console.warn(`   ⚠️ Erreur lors du chargement depuis ${tableName}:`, error.message);
            return null;
          }
          
          return data || [];
        };
        
        // Essayer d'abord properties_02 (table la plus récente)
        let propertiesData = await loadPropertiesFromTable('properties_02');
        
        // Si aucune donnée trouvée dans properties_02, essayer properties
        if (!propertiesData || propertiesData.length === 0) {
          console.log('🔄 Aucune propriété trouvée dans properties_02, essai avec properties...');
          propertiesData = await loadPropertiesFromTable('properties');
        }
        
        // Si toujours rien, essayer une par une dans les deux tables
        if (!propertiesData || propertiesData.length === 0) {
          console.log('🔄 Tentative de chargement une par une dans les deux tables...');
          for (const propertyId of propertyIds) {
            // Essayer d'abord properties_02
            let propertyData = null;
            let singleError = null;
            
            const { data: data02, error: error02 } = await supabase
              .from('properties_02')
              .select('id, title, address, city, property_type, surface_area, bedrooms, bathrooms, images')
              .eq('id', propertyId)
              .maybeSingle();
            
            if (!error02 && data02) {
              propertyData = data02;
            } else {
              // Essayer properties
              const { data: dataOld, error: errorOld } = await supabase
                .from('properties')
                .select('id, title, address, city, property_type, surface_area, bedrooms, bathrooms, images')
                .eq('id', propertyId)
                .maybeSingle();
              
              if (!errorOld && dataOld) {
                propertyData = dataOld;
              } else {
                singleError = error02 || errorOld;
              }
            }
            
            if (propertyData) {
              console.log(`   ✅ Propriété ${propertyId} chargée: ${propertyData.title || 'Sans titre'}`);
              propertiesMap.set(propertyData.id, propertyData);
            } else {
              console.warn(`   ⚠️ Propriété ${propertyId} non trouvée dans properties_02 ni properties:`, singleError?.message || 'Aucune donnée');
            }
          }
        } else {
          // Propriétés chargées avec succès
          console.log(`✅ ${propertiesData.length} propriétés chargées avec succès`);
          propertiesData.forEach((prop: any) => {
            console.log(`   • ${prop.id}: ${prop.title || 'Sans titre'}`);
            propertiesMap.set(prop.id, prop);
          });
        }
      } else {
        console.warn('⚠️ Aucun property_id trouvé dans les baux');
      }
      
      console.log('📋 Map finale des propriétés:', Array.from(propertiesMap.keys()));
      console.log('═══════════════════════════════════════════════════════');

      // Charger les informations du propriétaire séparément
      const ownerIds = [...new Set(leasesData.map((lease: any) => lease.owner_id).filter(Boolean))];
      let ownersMap = new Map();
      
      if (ownerIds.length > 0) {
        const { data: ownersData, error: ownersError } = await supabase
          .from('users_2025_12_01_11_29')
          .select('id, full_name, email, phone')
          .in('id', ownerIds);

        if (ownersError) {
          console.error('Erreur lors du chargement des propriétaires:', ownersError);
        } else if (ownersData) {
          ownersData.forEach((owner: any) => {
            ownersMap.set(owner.id, owner);
          });
        }
      }

      // Fusionner les données et dédupliquer par ID de bail
      const leasesMap = new Map();
      leasesData.forEach((lease: any) => {
        // Si le bail n'existe pas déjà dans la map, l'ajouter
        if (!leasesMap.has(lease.id)) {
          leasesMap.set(lease.id, {
            ...lease,
            properties: propertiesMap.get(lease.property_id) || null,
            users_2025_12_01_11_29: ownersMap.get(lease.owner_id) || null
          });
        }
      });
      const data = Array.from(leasesMap.values());
      // Charger les paiements pour tous les baux
      const leaseIds = leasesData.map((lease: any) => lease.id);
      let paymentsMap = new Map();
      
      if (leaseIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .in('lease_id', leaseIds)
          .order('due_date', { ascending: true });

        if (paymentsError) {
          console.error('Erreur lors du chargement des paiements:', paymentsError);
        } else if (paymentsData) {
          // Grouper les paiements par lease_id
          paymentsData.forEach((payment: any) => {
            if (!paymentsMap.has(payment.lease_id)) {
              paymentsMap.set(payment.lease_id, []);
            }
            paymentsMap.get(payment.lease_id).push(payment);
          });
        }
      }

      const formattedRentals = (data || []).map((lease: any) => {
        const property = lease.properties;
        const owner = lease.users_2025_12_01_11_29;
        const isSigned = !!lease.signed_at;
        const isPendingSignature = lease.status === 'pending_signature';
        
        // Récupérer les paiements pour ce bail
        const payments = paymentsMap.get(lease.id) || [];
        const unpaidRents = payments
          .filter((p: any) => p.status === 'pending')
          .map((p: any) => {
            const paymentDate = new Date(p.due_date);
            const monthName = paymentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            return {
              id: p.id,
              month: monthName,
              amount: `${parseFloat(p.amount).toLocaleString('fr-FR')} FCFA`,
              dueDate: paymentDate.toLocaleDateString('fr-FR'),
              amountNumber: parseFloat(p.amount),
            };
          });
        
        const paidRents = payments
          .filter((p: any) => p.status === 'paid' && p.payment_date)
          .map((p: any) => {
            const paymentDate = new Date(p.due_date);
            const monthName = paymentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            const paidDate = new Date(p.payment_date);
            return {
              id: p.id,
              month: monthName,
              amount: `${parseFloat(p.amount).toLocaleString('fr-FR')} FCFA`,
              paidDate: paidDate.toLocaleDateString('fr-FR'),
              receiptUrl: `#`, // TODO: URL de la quittance si disponible
            };
          });
        
        return {
          id: lease.id,
          property: property?.title || 'Bien inconnu',
          property_title: property?.title || 'Bien inconnu',
          property_address: property ? `${property.address}, ${property.city}` : '',
          owner_name: owner?.full_name || 'Propriétaire inconnu',
          owner_id: lease.owner_id,
          property_id: lease.property_id,
          rent: `${lease.monthly_rent.toLocaleString('fr-FR')} FCFA`,
          monthly_rent: lease.monthly_rent,
          start_date: lease.start_date,
          end_date: lease.end_date,
          signed: isSigned,
          status: lease.status,
          is_pending_signature: isPendingSignature,
          security_deposit: lease.security_deposit,
          article5: lease.article5,
          article6: lease.article6,
          article7: lease.article7,
          article8: lease.article8,
          article9: lease.article9,
          article10: lease.article10,
          additional_notes: lease.additional_notes,
          image: property?.images && property.images.length > 0 
            ? property.images[0] 
            : `https://readdy.ai/api/search-image?query=property&width=400&height=300&seq=rental${lease.id}`,
          surface: `${property?.surface_area || 0} m²`,
          type: property?.property_type || 'Appartement',
          address: property ? `${property.address}, ${property.city}` : '',
          description: '',
          landlord: owner?.full_name || 'Propriétaire inconnu',
          startDate: lease.start_date ? new Date(lease.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          endDate: lease.end_date ? new Date(lease.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
          unpaidRents: unpaidRents,
          paidRents: paidRents,
      inventories: []
        };
      });

      setRentals(formattedRentals);
    } catch (error) {
      console.error('Erreur lors du chargement des locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRentalClick = (rental: any) => {
    setSelectedRental(rental);
    // Afficher la vue de signature si le bail n'est pas signé OU s'il est en attente de signature
    if (!rental.signed || rental.is_pending_signature) {
      setShowSignature(true);
    } else {
      setShowDetail(true);
    }
  };

  const handleSignatureComplete = async () => {
    if (!selectedRental) return;

    try {
      // Mettre à jour le bail : marquer comme signé ET changer le statut à 'active'
      const { error } = await supabase
        .from('leases')
        .update({ 
          signed_at: new Date().toISOString(),
          status: 'active' // Changer le statut de 'pending_signature' à 'active'
        })
        .eq('id', selectedRental.id);

      if (error) throw error;

      // Recharger les baux pour mettre à jour l'affichage
      await loadRentals();
      
      // Mettre à jour le rental sélectionné avec les nouvelles données
      const updatedRental = {
        ...selectedRental,
        signed: true,
        status: 'active',
        is_pending_signature: false
      };
      setSelectedRental(updatedRental);
      
      setShowSignature(false);
      setShowDetail(true);
    } catch (error: any) {
      console.error('Erreur lors de la signature:', error);
      alert(`Une erreur est survenue lors de la signature: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleBack = () => {
    setShowDetail(false);
    setShowSignature(false);
    setSelectedRental(null);
  };

  if (showSignature && selectedRental) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className="pt-16 md:pt-24 pb-12 md:pb-16">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6">
            <SignatureView 
              rental={selectedRental} 
              onBack={handleBack}
              onComplete={handleSignatureComplete}
            />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (showDetail && selectedRental) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
        <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        <div className="pt-16 md:pt-24 pb-12 md:pb-16">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6">
            <RentalDetailView 
              rental={selectedRental} 
              onBack={handleBack}
            />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="pt-16 md:pt-24 pb-12 md:pb-16">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4 md:mb-6">
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 md:mb-2">Mes locations</h1>
                <p className="text-sm md:text-base lg:text-lg text-gray-600">Gérez vos biens loués et vos paiements</p>
              </div>
              {/* Filtre par statut */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <label htmlFor="status-filter" className="text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Filtrer par statut :
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs md:text-sm cursor-pointer bg-white"
                >
                  <option value="all">Toutes les locations</option>
                  <option value="pending_signature">En attente de signature</option>
                  <option value="active">Actives</option>
                  <option value="terminated">Clôturées</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 md:py-20">
              <div className="text-center">
                <i className="ri-loader-4-line text-4xl md:text-5xl text-teal-600 animate-spin"></i>
                <p className="mt-3 md:mt-4 text-sm md:text-base text-gray-600">Chargement...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Rentals Grid */}
              {(() => {
                // Dédupliquer les locations par ID avant de filtrer (protection contre les doublons)
                const uniqueRentals = Array.from(
                  new Map(rentals.map(rental => [rental.id, rental])).values()
                );
                
                // Filtrer les locations selon le statut sélectionné
                const filteredRentals = statusFilter === 'all' 
                  ? uniqueRentals 
                  : uniqueRentals.filter(rental => rental.status === statusFilter);
                
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      {filteredRentals.map((rental) => (
                        <RentalCard 
                          key={rental.id} 
                          rental={rental} 
                          onClick={() => handleRentalClick(rental)}
                        />
                      ))}
                    </div>
                    
                    {filteredRentals.length === 0 && rentals.length > 0 && (
                      <div className="bg-white rounded-xl md:rounded-2xl p-8 md:p-12 lg:p-16 text-center shadow-sm">
                        <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full mx-auto mb-4 md:mb-6">
                          <i className="ri-filter-line text-3xl md:text-4xl text-gray-400"></i>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Aucune location trouvée</h3>
                        <p className="text-sm md:text-base text-gray-600">
                          Aucune location ne correspond au filtre sélectionné
                        </p>
                      </div>
                    )}
                    
                    {rentals.length === 0 && (
                      <div className="bg-white rounded-xl md:rounded-2xl p-8 md:p-12 lg:p-16 text-center shadow-sm">
                        <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full mx-auto mb-4 md:mb-6">
                          <i className="ri-home-line text-3xl md:text-4xl text-gray-400"></i>
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Aucune location</h3>
                        <p className="text-sm md:text-base text-gray-600">Vous n'avez pas encore de bien loué</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Page de résultat de paiement */}
      {paymentResult && (
        <PaymentResult 
          status={paymentResult} 
          onClose={() => setPaymentResult(null)} 
        />
      )}

      <Footer />
    </div>
  );
}
