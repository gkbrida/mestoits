import { supabase } from '../lib/supabase';

export type TransactionType = 'reservation' | 'rent_payment' | 'installment_payment';

/**
 * Obtient le taux de commission pour un type de transaction
 */
export async function getCommissionRate(transactionType: TransactionType): Promise<number> {
  try {
    const keyMap = {
      reservation: 'commission_reservation_rate',
      rent_payment: 'commission_rent_rate',
      installment_payment: 'commission_installment_rate'
    };

    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', keyMap[transactionType])
      .single();

    if (error || !data) {
      // Taux par défaut si non configuré
      const defaultRates = {
        reservation: 5.0,
        rent_payment: 3.0,
        installment_payment: 3.0
      };
      return defaultRates[transactionType];
    }

    return parseFloat(data.value as string);
  } catch (error) {
    console.error('Erreur lors de la récupération du taux de commission:', error);
    // Taux par défaut en cas d'erreur
    const defaultRates = {
      reservation: 5.0,
      rent_payment: 3.0,
      installment_payment: 3.0
    };
    return defaultRates[transactionType];
  }
}

/**
 * Calcule le montant de la commission
 */
export function calculateCommission(amount: number, rate: number): number {
  return (amount * rate) / 100;
}

/**
 * Enregistre une commission
 */
export async function recordCommission(
  transactionType: TransactionType,
  transactionId: string,
  userId: string | null,
  amount: number,
  commissionRate: number,
  commissionAmount: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('commissions')
      .insert({
        transaction_type: transactionType,
        transaction_id: transactionId,
        user_id: userId,
        amount: amount,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erreur lors de l\'enregistrement de la commission:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la commission:', error);
    return null;
  }
}

/**
 * Marque une commission comme collectée
 */
export async function markCommissionAsCollected(commissionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('commissions')
      .update({
        status: 'collected',
        collected_at: new Date().toISOString()
      })
      .eq('id', commissionId);

    if (error) {
      console.error('Erreur lors de la mise à jour de la commission:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la commission:', error);
    return false;
  }
}

/**
 * Calcule et enregistre une commission pour une transaction
 */
export async function processCommission(
  transactionType: TransactionType,
  transactionId: string,
  userId: string | null,
  amount: number
): Promise<string | null> {
  try {
    const rate = await getCommissionRate(transactionType);
    const commissionAmount = calculateCommission(amount, rate);
    
    const commissionId = await recordCommission(
      transactionType,
      transactionId,
      userId,
      amount,
      rate,
      commissionAmount
    );

    return commissionId;
  } catch (error) {
    console.error('Erreur lors du traitement de la commission:', error);
    return null;
  }
}
