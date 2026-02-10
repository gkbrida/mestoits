/**
 * Utilitaire pour générer un PDF de bordereau de paiement échelonné
 * Utilise la fonctionnalité native d'impression du navigateur
 */

interface InstallmentPayment {
  id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  payment_date?: string;
  status: string;
}

interface InstallmentPlanReceiptData {
  id: string;
  property_title: string;
  property_address?: string;
  property_city?: string;
  owner_name: string;
  owner_email?: string;
  owner_phone?: string;
  payer_name: string;
  payer_email?: string;
  payer_phone?: string;
  total_amount: number;
  number_of_installments: number;
  installment_amount: number;
  start_date: string;
  frequency: string;
  payment_due_day?: number | null;
  status: string;
  payments: InstallmentPayment[];
}

/**
 * Génère un PDF de bordereau de paiement échelonné
 */
export function generateInstallmentPaymentReceiptPDF(data: InstallmentPlanReceiptData): void {
  const formatPrice = (price: number | string | null | undefined): string => {
    if (!price) return '0 FCFA';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('fr-FR').format(numPrice) + ' FCFA';
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Non renseigné';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Catégoriser les paiements
  const paidPayments = data.payments.filter(p => p.status === 'paid');
  const pendingPayments = data.payments.filter(p => {
    if (p.status === 'paid') return false;
    const dueDate = new Date(p.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate >= today;
  });
  const overduePayments = data.payments.filter(p => {
    if (p.status === 'paid') return false;
    const dueDate = new Date(p.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  });

  const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalRemaining = data.total_amount - totalPaid;

  const getFrequencyLabel = (frequency: string): string => {
    const labels: Record<string, string> = {
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
    };
    return labels[frequency] || frequency;
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bordereau de paiement échelonné - ${data.property_title}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 2cm;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .receipt-number {
      margin-top: 10px;
      font-size: 14px;
      opacity: 0.9;
    }
    .section {
      margin: 25px 0;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #14b8a6;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #14b8a6;
    }
    .info-row {
      margin: 8px 0;
      display: flex;
    }
    .info-label {
      font-weight: bold;
      min-width: 180px;
      color: #6b7280;
    }
    .info-value {
      color: #1f2937;
    }
    .summary-box {
      background: #f0fdfa;
      border: 2px solid #14b8a6;
      padding: 20px;
      margin: 30px 0;
      border-radius: 8px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      font-size: 16px;
    }
    .summary-label {
      color: #6b7280;
    }
    .summary-value {
      font-weight: bold;
      color: #1f2937;
    }
    .summary-total {
      font-size: 20px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #14b8a6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #f3f4f6;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .status-paid {
      color: #059669;
      font-weight: bold;
    }
    .status-pending {
      color: #d97706;
      font-weight: bold;
    }
    .status-overdue {
      color: #dc2626;
      font-weight: bold;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>BORDEREAU DE PAIEMENT ÉCHELONNÉ</h1>
    <div class="receipt-number">N° PLAN-${data.id.substring(0, 8).toUpperCase()}</div>
  </div>

  <div class="section">
    <div class="section-title">INFORMATIONS DU BIEN</div>
    <div class="info-row">
      <span class="info-label">Titre:</span>
      <span class="info-value">${data.property_title}</span>
    </div>
    ${data.property_address || data.property_city ? `
    <div class="info-row">
      <span class="info-label">Adresse:</span>
      <span class="info-value">${[data.property_address, data.property_city].filter(Boolean).join(', ')}</span>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">INFORMATIONS DU PROPRIÉTAIRE</div>
    <div class="info-row">
      <span class="info-label">Nom:</span>
      <span class="info-value">${data.owner_name}</span>
    </div>
    ${data.owner_email ? `
    <div class="info-row">
      <span class="info-label">Email:</span>
      <span class="info-value">${data.owner_email}</span>
    </div>
    ` : ''}
    ${data.owner_phone ? `
    <div class="info-row">
      <span class="info-label">Téléphone:</span>
      <span class="info-value">${data.owner_phone}</span>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">INFORMATIONS DU PAYEUR</div>
    <div class="info-row">
      <span class="info-label">Nom:</span>
      <span class="info-value">${data.payer_name}</span>
    </div>
    ${data.payer_email ? `
    <div class="info-row">
      <span class="info-label">Email:</span>
      <span class="info-value">${data.payer_email}</span>
    </div>
    ` : ''}
    ${data.payer_phone ? `
    <div class="info-row">
      <span class="info-label">Téléphone:</span>
      <span class="info-value">${data.payer_phone}</span>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">CONDITIONS DU PLAN DE PAIEMENT</div>
    <div class="info-row">
      <span class="info-label">Montant total:</span>
      <span class="info-value">${formatPrice(data.total_amount)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Nombre d'échéances:</span>
      <span class="info-value">${data.number_of_installments}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Montant par échéance:</span>
      <span class="info-value">${formatPrice(data.installment_amount)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Fréquence:</span>
      <span class="info-value">${getFrequencyLabel(data.frequency)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date de début:</span>
      <span class="info-value">${formatDate(data.start_date)}</span>
    </div>
    ${data.payment_due_day ? `
    <div class="info-row">
      <span class="info-label">Jour d'échéance:</span>
      <span class="info-value">Le ${data.payment_due_day} de chaque mois</span>
    </div>
    ` : ''}
  </div>

  <div class="summary-box">
    <div class="section-title" style="margin-top: 0; border-bottom: none; padding-bottom: 0;">RÉSUMÉ FINANCIER</div>
    <div class="summary-row">
      <span class="summary-label">Montant total:</span>
      <span class="summary-value">${formatPrice(data.total_amount)}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Montant déjà payé:</span>
      <span class="summary-value status-paid">${formatPrice(totalPaid)}</span>
    </div>
    <div class="summary-row summary-total">
      <span class="summary-label">Montant restant:</span>
      <span class="summary-value">${formatPrice(totalRemaining)}</span>
    </div>
  </div>

  ${paidPayments.length > 0 ? `
  <div class="section">
    <div class="section-title">ÉCHÉANCES PAYÉES (${paidPayments.length})</div>
    <table>
      <thead>
        <tr>
          <th>N°</th>
          <th>Date d'échéance</th>
          <th>Montant</th>
          <th>Date de paiement</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>
        ${paidPayments.map(payment => `
          <tr>
            <td>${payment.installment_number}</td>
            <td>${formatDate(payment.due_date)}</td>
            <td>${formatPrice(payment.amount)}</td>
            <td>${payment.payment_date ? formatDate(payment.payment_date) : '-'}</td>
            <td class="status-paid">Payé</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${overduePayments.length > 0 ? `
  <div class="section">
    <div class="section-title">ÉCHÉANCES EN RETARD (${overduePayments.length})</div>
    <table>
      <thead>
        <tr>
          <th>N°</th>
          <th>Date d'échéance</th>
          <th>Montant</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>
        ${overduePayments.map(payment => `
          <tr>
            <td>${payment.installment_number}</td>
            <td>${formatDate(payment.due_date)}</td>
            <td>${formatPrice(payment.amount)}</td>
            <td class="status-overdue">En retard</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${pendingPayments.length > 0 ? `
  <div class="section">
    <div class="section-title">ÉCHÉANCES À VENIR (${pendingPayments.length})</div>
    <table>
      <thead>
        <tr>
          <th>N°</th>
          <th>Date d'échéance</th>
          <th>Montant</th>
          <th>Statut</th>
        </tr>
      </thead>
      <tbody>
        ${pendingPayments.map(payment => `
          <tr>
            <td>${payment.installment_number}</td>
            <td>${formatDate(payment.due_date)}</td>
            <td>${formatPrice(payment.amount)}</td>
            <td class="status-pending">À venir</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>Document généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <p>Mestoits - Plateforme immobilière</p>
  </div>
</body>
</html>
  `;

  // Créer une nouvelle fenêtre pour l'impression
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Veuillez autoriser les fenêtres popup pour télécharger le PDF.');
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Attendre que le contenu soit chargé puis déclencher l'impression
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}
