/**
 * Utilitaire pour générer un PDF de récépissé de réservation
 * Utilise la fonctionnalité native d'impression du navigateur
 */

interface ReservationReceiptData {
  id: string;
  property_title: string;
  property_address?: string;
  property_city?: string;
  owner_name: string;
  owner_email?: string;
  owner_phone?: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  start_date: string;
  end_date: string;
  nights: number;
  total_amount: number;
  status: string;
  created_at: string;
}

/**
 * Génère un PDF de récépissé de réservation
 */
export function generateReservationReceiptPDF(data: ReservationReceiptData): void {
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

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      cancelled: 'Annulée',
      completed: 'Terminée',
    };
    return labels[status] || status;
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Récépissé de réservation - ${data.property_title}</title>
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
    .amount-box {
      background: #f0fdfa;
      border: 2px solid #14b8a6;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
      border-radius: 8px;
    }
    .amount-box .amount {
      font-size: 32px;
      font-weight: bold;
      color: #14b8a6;
      margin: 10px 0;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
    }
    .status-confirmed {
      background: #d1fae5;
      color: #065f46;
    }
    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }
    .status-cancelled {
      background: #fee2e2;
      color: #991b1b;
    }
    .status-completed {
      background: #dbeafe;
      color: #1e40af;
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
    <h1>RÉCÉPISSÉ DE RÉSERVATION</h1>
    <div class="receipt-number">N° RES-${data.id.substring(0, 8).toUpperCase()}</div>
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
    <div class="section-title">INFORMATIONS DU CLIENT</div>
    <div class="info-row">
      <span class="info-label">Nom:</span>
      <span class="info-value">${data.guest_name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Email:</span>
      <span class="info-value">${data.guest_email}</span>
    </div>
    ${data.guest_phone ? `
    <div class="info-row">
      <span class="info-label">Téléphone:</span>
      <span class="info-value">${data.guest_phone}</span>
    </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">DÉTAILS DE LA RÉSERVATION</div>
    <div class="info-row">
      <span class="info-label">Date de début:</span>
      <span class="info-value">${formatDate(data.start_date)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date de fin:</span>
      <span class="info-value">${formatDate(data.end_date)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Nombre de nuits:</span>
      <span class="info-value">${data.nights}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Statut:</span>
      <span class="info-value">
        <span class="status-badge status-${data.status}">${getStatusLabel(data.status)}</span>
      </span>
    </div>
  </div>

  <div class="amount-box">
    <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Montant total</div>
    <div class="amount">${formatPrice(data.total_amount)}</div>
  </div>

  <div class="footer">
    <p>Document généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    <p>Réservation créée le ${formatDate(data.created_at)}</p>
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
