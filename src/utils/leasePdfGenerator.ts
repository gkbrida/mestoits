/**
 * Utilitaire pour générer un PDF du contrat de bail
 * Utilise la fonctionnalité native d'impression du navigateur
 */

interface LeaseData {
  id: string;
  property_title: string;
  property_address: string;
  property_city?: string;
  property_surface_area?: number | null;
  property_rooms?: number | null;
  property_bedrooms?: number | null;
  property_bathrooms?: number | null;
  tenant_name: string;
  tenant_email?: string;
  tenant_phone?: string;
  owner_name: string;
  owner_email?: string;
  owner_phone?: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  security_deposit: number;
  advance_rent_amount?: number | null;
  payment_due_day?: number | null;
  article5?: string | null;
  article6?: string | null;
  article7?: string | null;
  article8?: string | null;
  article9?: string | null;
  article10?: string | null;
  additional_notes?: string | null;
  signed_at?: string | null;
  created_at?: string;
}

/**
 * Génère un PDF du contrat de bail en utilisant l'impression native du navigateur
 */
export function generateLeasePDF(leaseData: LeaseData): void {
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

  const articles = [
    { num: 1, label: 'État des lieux', content: leaseData.article5 },
    { num: 2, label: 'Obligations du locataire', content: leaseData.article6 },
    { num: 3, label: 'Obligations du bailleur', content: leaseData.article7 },
    { num: 4, label: 'Paiement du loyer', content: leaseData.article8 },
    { num: 5, label: 'Travaux et modifications', content: leaseData.article9 },
    { num: 6, label: 'Résiliation du bail', content: leaseData.article10 },
  ].filter(article => article.content);

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat de bail - ${leaseData.property_title}</title>
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
    .subsection-title {
      font-size: 14px;
      font-weight: bold;
      margin-top: 15px;
      margin-bottom: 8px;
      color: #374151;
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
    .article {
      margin: 20px 0;
      padding: 15px;
      background: #f9fafb;
      border-left: 4px solid #14b8a6;
      border-radius: 4px;
    }
    .article-title {
      font-weight: bold;
      margin-bottom: 8px;
      color: #374151;
    }
    .article-content {
      color: #1f2937;
      white-space: pre-wrap;
    }
    .signatures {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 45%;
      text-align: center;
    }
    .signature-line {
      border-top: 2px solid #333;
      margin-top: 60px;
      padding-top: 5px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 10px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>CONTRAT DE BAIL</h1>
  </div>

  <div class="section">
    <div class="section-title">INFORMATIONS DU BIEN</div>
    <div class="info-row">
      <span class="info-label">Titre:</span>
      <span class="info-value">${leaseData.property_title}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Adresse:</span>
      <span class="info-value">${leaseData.property_address}${leaseData.property_city ? `, ${leaseData.property_city}` : ''}</span>
    </div>
    ${leaseData.property_surface_area ? `<div class="info-row">
      <span class="info-label">Superficie:</span>
      <span class="info-value">${leaseData.property_surface_area} m²</span>
    </div>` : ''}
    ${leaseData.property_rooms !== null && leaseData.property_rooms !== undefined ? `<div class="info-row">
      <span class="info-label">Nombre de pièces:</span>
      <span class="info-value">${leaseData.property_rooms}</span>
    </div>` : ''}
    ${leaseData.property_bedrooms !== null && leaseData.property_bedrooms !== undefined ? `<div class="info-row">
      <span class="info-label">Nombre de chambres:</span>
      <span class="info-value">${leaseData.property_bedrooms}</span>
    </div>` : ''}
    ${leaseData.property_bathrooms !== null && leaseData.property_bathrooms !== undefined ? `<div class="info-row">
      <span class="info-label">Nombre de salles de bain:</span>
      <span class="info-value">${leaseData.property_bathrooms}</span>
    </div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">PARTIES AU CONTRAT</div>
    
    <div class="subsection-title">BAILLEUR (Propriétaire)</div>
    <div class="info-row">
      <span class="info-label">Nom:</span>
      <span class="info-value">${leaseData.owner_name}</span>
    </div>
    ${leaseData.owner_email ? `<div class="info-row">
      <span class="info-label">Email:</span>
      <span class="info-value">${leaseData.owner_email}</span>
    </div>` : ''}
    ${leaseData.owner_phone ? `<div class="info-row">
      <span class="info-label">Téléphone:</span>
      <span class="info-value">${leaseData.owner_phone}</span>
    </div>` : ''}
    
    <div class="subsection-title">PRENEUR (Locataire)</div>
    <div class="info-row">
      <span class="info-label">Nom:</span>
      <span class="info-value">${leaseData.tenant_name}</span>
    </div>
    ${leaseData.tenant_email ? `<div class="info-row">
      <span class="info-label">Email:</span>
      <span class="info-value">${leaseData.tenant_email}</span>
    </div>` : ''}
    ${leaseData.tenant_phone ? `<div class="info-row">
      <span class="info-label">Téléphone:</span>
      <span class="info-value">${leaseData.tenant_phone}</span>
    </div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">CONDITIONS DU BAIL</div>
    <div class="info-row">
      <span class="info-label">Date de début:</span>
      <span class="info-value">${formatDate(leaseData.start_date)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date de fin:</span>
      <span class="info-value">${formatDate(leaseData.end_date)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Loyer mensuel:</span>
      <span class="info-value">${formatPrice(leaseData.monthly_rent)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Dépôt de garantie:</span>
      <span class="info-value">${formatPrice(leaseData.security_deposit)}</span>
    </div>
    ${leaseData.advance_rent_amount ? `<div class="info-row">
      <span class="info-label">Avance sur loyer:</span>
      <span class="info-value">${formatPrice(leaseData.advance_rent_amount)}</span>
    </div>` : ''}
    ${leaseData.payment_due_day ? `<div class="info-row">
      <span class="info-label">Jour d'échéance:</span>
      <span class="info-value">Le ${leaseData.payment_due_day} de chaque mois</span>
    </div>` : ''}
  </div>

  ${articles.length > 0 ? `
  <div class="section">
    <div class="section-title">ARTICLES DU CONTRAT</div>
    ${articles.map(article => `
      <div class="article">
        <div class="article-title">Article ${article.num} - ${article.label}</div>
        <div class="article-content">${article.content}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${leaseData.additional_notes ? `
  <div class="section">
    <div class="section-title">NOTES ADDITIONNELLES</div>
    <div style="white-space: pre-wrap; color: #1f2937;">${leaseData.additional_notes}</div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">SIGNATURES</div>
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div style="margin-top: 5px;">Le Bailleur</div>
        <div style="margin-top: 5px; font-weight: bold;">${leaseData.owner_name}</div>
        <div style="margin-top: 10px; font-size: 10px; color: #6b7280; font-style: italic;">Signé électroniquement</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div style="margin-top: 5px;">Le Locataire</div>
        <div style="margin-top: 5px; font-weight: bold;">${leaseData.tenant_name}</div>
        <div style="margin-top: 10px; font-size: 10px; color: #6b7280; font-style: italic;">Signé électroniquement</div>
      </div>
    </div>
    ${leaseData.signed_at ? `
      <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
        Contrat signé électroniquement le ${formatDate(leaseData.signed_at)}
      </div>
    ` : ''}
  </div>

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
      // Fermer la fenêtre après l'impression (optionnel)
      // printWindow.close();
    }, 250);
  };
}
