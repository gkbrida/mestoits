import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type TransactionType = 'reservation' | 'rent_payment' | 'installment_payment';

/**
 * Obtient le taux de commission pour un type de transaction
 */
async function getCommissionRate(transactionType: TransactionType): Promise<number> {
  try {
    const keyMap = {
      reservation: 'commission_reservation_rate',
      rent_payment: 'commission_rent_rate',
      installment_payment: 'commission_installment_rate'
    };

    const { data, error } = await supabaseAdmin
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
function calculateCommission(amount: number, rate: number): number {
  return (amount * rate) / 100;
}

/**
 * Traite une commission pour une transaction
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
    
    const { data, error } = await supabaseAdmin
      .from('commissions')
      .insert({
        transaction_type: transactionType,
        transaction_id: transactionId,
        user_id: userId,
        amount: amount,
        commission_rate: rate,
        commission_amount: commissionAmount,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erreur lors de l\'enregistrement de la commission:', error);
      return null;
    }

    console.log(`✅ Commission enregistrée: ${commissionAmount.toFixed(2)} FCFA (${rate}% de ${amount.toFixed(2)} FCFA)`);
    return data.id;
  } catch (error) {
    console.error('Erreur lors du traitement de la commission:', error);
    return null;
  }
}
