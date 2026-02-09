import { supabase } from '../lib/supabase';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  user_type: 'individual' | 'professional';
  plan_type: string;
  price: number;
  features: {
    can_publish: boolean;
    can_access_rental_management: boolean;
    can_access_directory: boolean;
  };
  restrictions: {
    max_properties_per_period: number | null;
    period_days: number | null;
  } | null;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'expired' | 'cancelled';
}

/**
 * Vérifie si les restrictions d'abonnement sont activées
 */
export async function areRestrictionsEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'subscription_restrictions_enabled')
      .single();

    if (error || !data) {
      return false; // Par défaut, pas de restrictions si le paramètre n'existe pas
    }

    return data.value as boolean;
  } catch (error) {
    console.error('Erreur lors de la vérification des restrictions:', error);
    return false;
  }
}

/**
 * Vérifie si un utilisateur peut publier une annonce
 */
export async function canUserPublishProperty(userId: string): Promise<boolean> {
  try {
    const restrictionsEnabled = await areRestrictionsEnabled();
    
    if (!restrictionsEnabled) {
      return true; // Si les restrictions sont désactivées, autoriser
    }

    // Appeler la fonction PostgreSQL
    const { data, error } = await supabase.rpc('can_user_publish_property', {
      user_uuid: userId
    });

    if (error) {
      console.error('Erreur lors de la vérification de publication:', error);
      return false;
    }

    return data as boolean;
  } catch (error) {
    console.error('Erreur lors de la vérification de publication:', error);
    return false;
  }
}

/**
 * Vérifie si un utilisateur peut accéder à la gestion locative
 */
export async function canUserAccessRentalManagement(userId: string): Promise<boolean> {
  try {
    const restrictionsEnabled = await areRestrictionsEnabled();
    
    if (!restrictionsEnabled) {
      return true; // Si les restrictions sont désactivées, autoriser
    }

    // Appeler la fonction PostgreSQL
    const { data, error } = await supabase.rpc('can_user_access_rental_management', {
      user_uuid: userId
    });

    if (error) {
      console.error('Erreur lors de la vérification d\'accès gestion locative:', error);
      return false;
    }

    return data as boolean;
  } catch (error) {
    console.error('Erreur lors de la vérification d\'accès gestion locative:', error);
    return false;
  }
}

/**
 * Enregistre une publication d'annonce
 */
export async function recordPropertyPublication(userId: string, propertyId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('property_publications')
      .insert({
        user_id: userId,
        property_id: propertyId,
        published_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erreur lors de l\'enregistrement de la publication:', error);
    }
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la publication:', error);
  }
}

/**
 * Obtient le plan actif d'un utilisateur
 */
export async function getUserActivePlan(userId: string): Promise<SubscriptionPlan | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_active_plan', {
      user_uuid: userId
    });

    if (error || !data || data.length === 0) {
      // Retourner le plan gratuit par défaut
      const { data: userData } = await supabase
        .from('users_2025_12_01_11_29')
        .select('user_type')
        .eq('id', userId)
        .single();

      if (userData) {
        const { data: freePlan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('user_type', userData.user_type)
          .eq('plan_type', 'free')
          .single();

        return freePlan as SubscriptionPlan | null;
      }
      return null;
    }

    const planData = data[0];
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planData.plan_id)
      .single();

    return plan as SubscriptionPlan | null;
  } catch (error) {
    console.error('Erreur lors de la récupération du plan:', error);
    return null;
  }
}
