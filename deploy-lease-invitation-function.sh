#!/bin/bash

# Script de déploiement de l'Edge Function notify-lease-invitation
# Usage: ./deploy-lease-invitation-function.sh

echo "=== Déploiement de l'Edge Function notify-lease-invitation ==="
echo ""

# Vérifier que Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo "❌ Erreur: Supabase CLI n'est pas installé"
    echo "Installez-le avec: npm install -g supabase"
    exit 1
fi

# Se placer dans le répertoire du projet
cd "/Users/macdekevins/Documents/developement/project-zoe immo r2"

echo "📦 Déploiement de la fonction notify-lease-invitation..."
supabase functions deploy notify-lease-invitation

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Fonction déployée avec succès !"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "1. Vérifiez les logs: supabase functions logs notify-lease-invitation --tail"
    echo "2. Testez la fonction depuis le dashboard Supabase"
    echo "3. Créez une location pour tester l'envoi d'email"
else
    echo ""
    echo "❌ Erreur lors du déploiement"
    echo "Vérifiez que vous êtes connecté à Supabase: supabase login"
fi

