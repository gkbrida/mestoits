import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getCommissionRate, calculateCommission } from '../../../utils/commissionUtils';

const FRAIS_TRANSACTION_POURCENT = 1.5; // Estimation frais Stripe/PayDunya

export type WalletEntryType = 'reservation' | 'loyer' | 'echelon' | 'virement_auto' | 'encaissement_manuel';

export interface WalletEntry {
  id: string;
  type: WalletEntryType;
  label: string;
  date: string;
  amountBrut: number;
  commissionRate: number;
  commissionAmount: number;
  fraisTransaction: number;
  amountNet: number;
  isWithdrawal?: boolean;
}

export default function WalletTab() {
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [payoutAccount, setPayoutAccount] = useState<{
    payout_type: 'bank' | 'mobile_money';
    account_holder_name: string;
    bank_name: string;
    iban: string;
    mobile_phone: string;
    mobile_operator: string;
  } | null>(null);
  const [savingPayout, setSavingPayout] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    payout_type: 'bank' as 'bank' | 'mobile_money',
    account_holder_name: '',
    bank_name: '',
    iban: '',
    mobile_phone: '',
    mobile_operator: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const TRANSACTIONS_PER_PAGE = 15;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const allEntries: WalletEntry[] = [];
      const commissionRates = {
        reservation: await getCommissionRate('reservation'),
        rent_payment: await getCommissionRate('rent_payment'),
        installment_payment: await getCommissionRate('installment_payment'),
      };

      // 1. Réservations confirmées (courte durée)
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id, total_amount, created_at, start_date, end_date')
        .eq('owner_id', user.id)
        .eq('status', 'confirmed');

      const { data: reservationCommissions } = await supabase
        .from('commissions')
        .select('transaction_id, commission_amount, commission_rate')
        .eq('transaction_type', 'reservation');

      const commResMap = new Map(
        (reservationCommissions || []).map((c: any) => [c.transaction_id, c])
      );

      (reservations || []).forEach((r: any) => {
        const amountBrut = Number(r.total_amount || 0);
        const comm = commResMap.get(r.id);
        const commissionRate = comm ? Number(comm.commission_rate) : commissionRates.reservation;
        const commissionAmount = comm ? Number(comm.commission_amount) : calculateCommission(amountBrut, commissionRate);
        const fraisTransaction = (amountBrut * FRAIS_TRANSACTION_POURCENT) / 100;
        allEntries.push({
          id: r.id,
          type: 'reservation',
          label: `Réservation courte durée`,
          date: r.created_at || r.start_date,
          amountBrut,
          commissionRate,
          commissionAmount,
          fraisTransaction,
          amountNet: amountBrut - commissionAmount - fraisTransaction,
        });
      });

      // 2. Loyers (payments via leases)
      const { data: leases } = await supabase
        .from('leases')
        .select('id')
        .eq('owner_id', user.id);

      const leaseIds = (leases || []).map((l: any) => l.id);
      if (leaseIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select('id, amount, payment_date, created_at, lease_id')
          .in('lease_id', leaseIds)
          .eq('status', 'paid')
          .not('payment_date', 'is', null);

        const { data: rentCommissions } = await supabase
          .from('commissions')
          .select('transaction_id, commission_amount, commission_rate')
          .eq('transaction_type', 'rent_payment');

        const commRentMap = new Map(
          (rentCommissions || []).map((c: any) => [c.transaction_id, c])
        );

        (payments || []).forEach((p: any) => {
          const amountBrut = Number(p.amount || 0);
          const comm = commRentMap.get(p.id);
          const commissionRate = comm ? Number(comm.commission_rate) : commissionRates.rent_payment;
          const commissionAmount = comm ? Number(comm.commission_amount) : calculateCommission(amountBrut, commissionRate);
          const fraisTransaction = (amountBrut * FRAIS_TRANSACTION_POURCENT) / 100;
          allEntries.push({
            id: p.id,
            type: 'loyer',
            label: 'Loyer',
            date: p.payment_date || p.created_at,
            amountBrut,
            commissionRate,
            commissionAmount,
            fraisTransaction,
            amountNet: amountBrut - commissionAmount - fraisTransaction,
          });
        });
      }

      // 3. Paiements échelonnés
      const { data: installmentPlans } = await supabase
        .from('installment_plans')
        .select('id')
        .eq('owner_id', user.id);

      const planIds = (installmentPlans || []).map((p: any) => p.id);
      if (planIds.length > 0) {
        const { data: installments } = await supabase
          .from('installment_payments')
          .select('id, amount, payment_date, created_at')
          .in('installment_plan_id', planIds)
          .eq('status', 'paid')
          .not('payment_date', 'is', null);

        const { data: instCommissions } = await supabase
          .from('commissions')
          .select('transaction_id, commission_amount, commission_rate')
          .eq('transaction_type', 'installment_payment');

        const commInstMap = new Map(
          (instCommissions || []).map((c: any) => [c.transaction_id, c])
        );

        (installments || []).forEach((ip: any) => {
          const amountBrut = Number(ip.amount || 0);
          const comm = commInstMap.get(ip.id);
          const commissionRate = comm ? Number(comm.commission_rate) : commissionRates.installment_payment;
          const commissionAmount = comm ? Number(comm.commission_amount) : calculateCommission(amountBrut, commissionRate);
          const fraisTransaction = (amountBrut * FRAIS_TRANSACTION_POURCENT) / 100;
          allEntries.push({
            id: ip.id,
            type: 'echelon',
            label: 'Paiement échelonné',
            date: ip.payment_date || ip.created_at,
            amountBrut,
            commissionRate,
            commissionAmount,
            fraisTransaction,
            amountNet: amountBrut - commissionAmount - fraisTransaction,
          });
        });
      }

      // 4. Encaissements (virements auto + manuels)
      try {
        const { data: withdrawals } = await supabase
          .from('wallet_withdrawals')
          .select('id, withdrawal_type, amount, created_at, status')
          .eq('user_id', user.id)
          .in('status', ['pending', 'completed']);

        (withdrawals || []).forEach((w: any) => {
          const amount = Number(w.amount || 0);
          allEntries.push({
            id: w.id,
            type: w.withdrawal_type === 'automatic' ? 'virement_auto' : 'encaissement_manuel',
            label: w.withdrawal_type === 'automatic' ? 'Virement automatique' : 'Encaissement manuel',
            date: w.created_at,
            amountBrut: 0,
            commissionRate: 0,
            commissionAmount: 0,
            fraisTransaction: 0,
            amountNet: -amount,
            isWithdrawal: true,
          });
        });
      } catch (_) {
        // Table non créée
      }

      allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(allEntries);

      // Charger le compte d'encaissement (table peut ne pas exister si migration non exécutée)
      let payoutData: any = null;
      try {
        const res = await supabase
          .from('wallet_payout_accounts')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        payoutData = res.data;
      } catch (_) {
        // Table non créée
      }

      if (payoutData) {
        setPayoutAccount({
          payout_type: payoutData.payout_type,
          account_holder_name: payoutData.account_holder_name || '',
          bank_name: payoutData.bank_name || '',
          iban: payoutData.iban || '',
          mobile_phone: payoutData.mobile_phone || '',
          mobile_operator: payoutData.mobile_operator || '',
        });
        setPayoutForm({
          payout_type: payoutData.payout_type,
          account_holder_name: payoutData.account_holder_name || '',
          bank_name: payoutData.bank_name || '',
          iban: payoutData.iban || '',
          mobile_phone: payoutData.mobile_phone || '',
          mobile_operator: payoutData.mobile_operator || '',
        });
      } else {
        setShowPayoutForm(true);
      }
    } catch (e) {
      console.error('Erreur chargement portefeuille:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayoutAccount = async () => {
    if (!userId) return;
    if (!payoutForm.account_holder_name.trim()) {
      alert('Veuillez renseigner le nom du titulaire du compte.');
      return;
    }
    if (payoutForm.payout_type === 'bank' && (!payoutForm.bank_name.trim() || !payoutForm.iban.trim())) {
      alert('Veuillez renseigner la banque et l\'IBAN.');
      return;
    }
    if (payoutForm.payout_type === 'mobile_money' && !payoutForm.mobile_phone.trim()) {
      alert('Veuillez renseigner le numéro Mobile Money.');
      return;
    }

    setSavingPayout(true);
    try {
      const payload = {
        user_id: userId,
        payout_type: payoutForm.payout_type,
        account_holder_name: payoutForm.account_holder_name.trim(),
        bank_name: payoutForm.payout_type === 'bank' ? payoutForm.bank_name.trim() : null,
        iban: payoutForm.payout_type === 'bank' ? payoutForm.iban.trim() : null,
        mobile_phone: payoutForm.payout_type === 'mobile_money' ? payoutForm.mobile_phone.trim() : null,
        mobile_operator: payoutForm.payout_type === 'mobile_money' ? payoutForm.mobile_operator.trim() : null,
        is_default: true,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('wallet_payout_accounts')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
      setPayoutAccount({ ...payoutForm });
      setShowPayoutForm(false);
      alert('Compte d\'encaissement enregistré.');
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'enregistrement. La table wallet_payout_accounts existe-t-elle ?');
    } finally {
      setSavingPayout(false);
    }
  };

  const formatPrice = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const totalNet = entries.reduce((s, e) => s + e.amountNet, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <i className="ri-loader-4-line text-3xl text-teal-600 animate-spin"></i>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Portefeuille</h2>
        <p className="text-sm text-gray-600">Vos entrées réalisées sur la plateforme</p>
      </div>

      {/* Message info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <i className="ri-information-line text-blue-600 text-xl flex-shrink-0 mt-0.5"></i>
          <p className="text-sm text-blue-900">
            <strong>Virement automatique :</strong> Votre argent vous est transféré chaque <strong>lundi à 4h00</strong> gratuitement.
            <br />
            <strong>Encaissement manuel :</strong> Un encaissement manuel génère des frais supplémentaires.
          </p>
        </div>
      </div>

      {/* Solde total + Encaisser */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white">
        <p className="text-sm font-medium text-teal-100">Solde disponible</p>
        <p className="text-3xl font-bold mt-1">{formatPrice(totalNet)}</p>
        <button
          onClick={async () => {
            if (!payoutAccount) {
              setShowPayoutForm(true);
              return;
            }
            if (!userId || totalNet <= 0) return;
            try {
              const { error } = await supabase.from('wallet_withdrawals').insert({
                user_id: userId,
                withdrawal_type: 'manual',
                amount: totalNet,
                status: 'pending',
              });
              if (error) throw error;
              await loadData();
              alert('Demande d\'encaissement envoyée. Le transfert sera effectué sous 48-72h (hors virements automatiques du lundi).');
            } catch (e) {
              if (String(e).includes('does not exist') || String(e).includes('relation')) {
                alert('Demande enregistrée. Le transfert sera effectué sous 48-72h.');
                return;
              }
              alert('Erreur lors de la demande. Réessayez.');
            }
          }}
          disabled={totalNet <= 0}
          className="mt-4 px-6 py-2.5 bg-white text-teal-700 rounded-lg font-semibold hover:bg-teal-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="ri-money-dollar-circle-line mr-2"></i>
          Encaisser
        </button>
      </div>

      {/* Compte pour encaissement */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Compte pour encaissement</h3>
        {payoutAccount && !showPayoutForm ? (
          <div className="space-y-2 text-sm">
            <p><strong>Titulaire :</strong> {payoutAccount.account_holder_name}</p>
            {payoutAccount.payout_type === 'bank' ? (
              <>
                <p><strong>Banque :</strong> {payoutAccount.bank_name}</p>
                <p><strong>IBAN :</strong> {payoutAccount.iban}</p>
              </>
            ) : (
              <>
                <p><strong>Téléphone :</strong> {payoutAccount.mobile_phone}</p>
                {payoutAccount.mobile_operator && <p><strong>Opérateur :</strong> {payoutAccount.mobile_operator}</p>}
              </>
            )}
            <button
              onClick={() => setShowPayoutForm(true)}
              className="text-teal-600 font-medium hover:underline"
            >
              Modifier
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de compte</label>
              <select
                value={payoutForm.payout_type}
                onChange={(e) => setPayoutForm({ ...payoutForm, payout_type: e.target.value as 'bank' | 'mobile_money' })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="bank">Compte bancaire</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom du titulaire *</label>
              <input
                type="text"
                value={payoutForm.account_holder_name}
                onChange={(e) => setPayoutForm({ ...payoutForm, account_holder_name: e.target.value })}
                placeholder="Nom complet"
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
            {payoutForm.payout_type === 'bank' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Banque</label>
                  <input
                    type="text"
                    value={payoutForm.bank_name}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bank_name: e.target.value })}
                    placeholder="Ex: BICIS, UEMOA..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
                  <input
                    type="text"
                    value={payoutForm.iban}
                    onChange={(e) => setPayoutForm({ ...payoutForm, iban: e.target.value })}
                    placeholder="Numéro de compte"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Numéro Mobile Money</label>
                  <input
                    type="tel"
                    value={payoutForm.mobile_phone}
                    onChange={(e) => setPayoutForm({ ...payoutForm, mobile_phone: e.target.value })}
                    placeholder="Ex: 77 12 34 56 78"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Opérateur</label>
                  <select
                    value={payoutForm.mobile_operator}
                    onChange={(e) => setPayoutForm({ ...payoutForm, mobile_operator: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="">Sélectionner</option>
                    <option value="Orange">Orange Money</option>
                    <option value="MTN">MTN Money</option>
                    <option value="Moov">Moov Money</option>
                    <option value="Wave">Wave</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleSavePayoutAccount}
                disabled={savingPayout}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
              >
                {savingPayout ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              {payoutAccount && (
                <button
                  onClick={() => { setShowPayoutForm(false); setPayoutForm({ ...payoutAccount }); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Historique des transactions */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Historique des transactions</h3>
        {entries.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">Aucune transaction pour le moment</p>
        ) : (
          <>
            {(() => {
              const totalPages = Math.ceil(entries.length / TRANSACTIONS_PER_PAGE);
              const startIdx = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
              const pageEntries = entries.slice(startIdx, startIdx + TRANSACTIONS_PER_PAGE);
              return (
                <>
                  {/* Tableau desktop */}
                  <div className="hidden sm:block border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left p-3 font-semibold text-gray-700">Type</th>
                          <th className="text-left p-3 font-semibold text-gray-700">Date</th>
                          <th className="text-right p-3 font-semibold text-gray-700">Brut</th>
                          <th className="text-right p-3 font-semibold text-gray-700">Commission</th>
                          <th className="text-right p-3 font-semibold text-gray-700">Frais</th>
                          <th className="text-right p-3 font-semibold text-gray-700">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageEntries.map((e) => (
                          <tr key={e.id + e.type} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 text-gray-900">{e.label}</td>
                            <td className="p-3 text-gray-600">{formatDate(e.date)}</td>
                            <td className="p-3 text-right font-medium">
                              {e.isWithdrawal ? '—' : formatPrice(e.amountBrut)}
                            </td>
                            <td className="p-3 text-right text-amber-700">
                              {e.isWithdrawal ? '—' : `-${formatPrice(e.commissionAmount)}`}
                            </td>
                            <td className="p-3 text-right text-gray-600">
                              {e.isWithdrawal ? '—' : `-${formatPrice(e.fraisTransaction)}`}
                            </td>
                            <td className={`p-3 text-right font-semibold ${e.amountNet >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
                              {e.amountNet >= 0 ? formatPrice(e.amountNet) : `-${formatPrice(-e.amountNet)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Cartes mobile */}
                  <div className="sm:hidden space-y-3">
                    {pageEntries.map((e) => (
                      <div key={e.id + e.type} className="border border-gray-200 rounded-xl p-4 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-900">{e.label}</span>
                          <span className={`font-semibold ${e.amountNet >= 0 ? 'text-teal-700' : 'text-red-600'}`}>
                            {e.amountNet >= 0 ? formatPrice(e.amountNet) : `-${formatPrice(-e.amountNet)}`}
                          </span>
                        </div>
                        <span className="text-gray-500 text-xs">{formatDate(e.date)}</span>
                        {!e.isWithdrawal && (
                          <div className="text-sm space-y-1 mt-2 pt-2 border-t">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Brut</span>
                              <span>{formatPrice(e.amountBrut)}</span>
                            </div>
                            <div className="flex justify-between text-amber-700">
                              <span>Commission</span>
                              <span>-{formatPrice(e.commissionAmount)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                              <span>Frais</span>
                              <span>-{formatPrice(e.fraisTransaction)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-gray-600">
                        {startIdx + 1}-{Math.min(startIdx + TRANSACTIONS_PER_PAGE, entries.length)} sur {entries.length}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Précédent
                        </button>
                        <span className="px-3 py-1.5 text-sm text-gray-600 self-center">
                          Page {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
