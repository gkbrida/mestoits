import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import NotFound from '../pages/NotFound';
import AdminRoute from '../components/admin/AdminRoute';

// Lazy load pages
const HomePage = lazy(() => import('../pages/home/page'));
const RechercheBiensPage = lazy(() => import('../pages/recherche-biens/page'));
const BienDetailPage = lazy(() => import('../pages/bien-detail/page'));
const DeposerAnnoncePage = lazy(() => import('../pages/deposer-annonce/page'));
const EstimationPage = lazy(() => import('../pages/estimation/page'));
const EstimationResultatPage = lazy(() => import('../pages/estimation/resultat/page'));
const CartePrixPage = lazy(() => import('../pages/carte-prix/page'));
const ProfessionnelsPage = lazy(() => import('../pages/professionnels/page'));
const ProfessionnelDetailPage = lazy(() => import('../pages/professionnel-detail/page'));
const RentalManagementPage = lazy(() => import('../pages/rental-management/page'));
const TenantRentalsPage = lazy(() => import('../pages/tenant-rentals/page'));
const ConnexionPage = lazy(() => import('../pages/auth/connexion/page'));
const InscriptionPage = lazy(() => import('../pages/auth/inscription/page'));
const MotDePasseOubliePage = lazy(() => import('../pages/auth/mot-de-passe-oublie/page'));
const ReinitialiserMotDePassePage = lazy(() => import('../pages/auth/reinitialiser-mot-de-passe/page'));
const ConfirmPage = lazy(() => import('../pages/auth/confirm/page'));
const ProfilPage = lazy(() => import('../pages/profil/page'));
const FavorisPage = lazy(() => import('../pages/favoris/page'));
const MessagesPage = lazy(() => import('../pages/messages/page'));
const AgendaPage = lazy(() => import('../pages/agenda/page'));
const MesReservationsPage = lazy(() => import('../pages/mes-reservations/page'));
const MesPaiementsEchelonnesPage = lazy(() => import('../pages/mes-paiements-echelonnes/page'));
const AffiliationPage = lazy(() => import('../pages/affiliation/page'));
const AffilierRedirectPage = lazy(() => import('../pages/affilier/page'));
const AidePage = lazy(() => import('../pages/aide/page'));
const AProposPage = lazy(() => import('../pages/a-propos/page'));
const MentionsLegalesPage = lazy(() => import('../pages/mentions-legales/page'));
const ConfidentialitePage = lazy(() => import('../pages/confidentialite/page'));
const CGUPage = lazy(() => import('../pages/cgu/page'));
const PartenairesPage = lazy(() => import('../pages/partenaires/page'));
const AdminLoginPage = lazy(() => import('../pages/admin/login/page'));
const AdminDashboardPage = lazy(() => import('../pages/admin/dashboard/page'));
const AdminIndexPage = lazy(() => import('../pages/admin/index/page'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/recherche-biens',
    element: <RechercheBiensPage />,
  },
  {
    path: '/bien/:id',
    element: <BienDetailPage />,
  },
  {
    path: '/deposer-annonce',
    element: <DeposerAnnoncePage />,
  },
  {
    path: '/estimation',
    element: <EstimationPage />,
  },
  {
    path: '/estimation/resultat/:id',
    element: <EstimationResultatPage />,
  },
  {
    path: '/carte-prix',
    element: <CartePrixPage />,
  },
  {
    path: '/professionnels',
    element: <ProfessionnelsPage />,
  },
  {
    path: '/professionnel/:id',
    element: <ProfessionnelDetailPage />,
  },
  {
    path: '/gestion-locative',
    element: <RentalManagementPage />,
  },
  {
    path: '/mes-locations',
    element: <TenantRentalsPage />,
  },
  {
    path: '/tenant-rentals',
    element: <TenantRentalsPage />,
  },
  {
    path: '/connexion',
    element: <ConnexionPage />,
  },
  {
    path: '/inscription',
    element: <InscriptionPage />,
  },
  {
    path: '/mot-de-passe-oublie',
    element: <MotDePasseOubliePage />,
  },
  {
    path: '/reinitialiser-mot-de-passe',
    element: <ReinitialiserMotDePassePage />,
  },
  {
    path: '/confirm',
    element: <ConfirmPage />,
  },
  {
    path: '/profil',
    element: <ProfilPage />,
  },
  {
    path: '/favoris',
    element: <FavorisPage />,
  },
  {
    path: '/messages',
    element: <MessagesPage />,
  },
  {
    path: '/agenda',
    element: <AgendaPage />,
  },
  {
    path: '/mes-reservations',
    element: <MesReservationsPage />,
  },
  {
    path: '/mes-paiements-echelonnes',
    element: <MesPaiementsEchelonnesPage />,
  },
  {
    path: '/affiliation',
    element: <AffiliationPage />,
  },
  {
    path: '/affilier/:code',
    element: <AffilierRedirectPage />,
  },
  {
    path: '/aide',
    element: <AidePage />,
  },
  {
    path: '/a-propos',
    element: <AProposPage />,
  },
  {
    path: '/mentions-legales',
    element: <MentionsLegalesPage />,
  },
  {
    path: '/confidentialite',
    element: <ConfidentialitePage />,
  },
  {
    path: '/cgu',
    element: <CGUPage />,
  },
  {
    path: '/partenaires/:type',
    element: <PartenairesPage />,
  },
  {
    path: '/admin',
    element: <AdminIndexPage />,
  },
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '/admin/dashboard',
    element: (
      <AdminRoute>
        <AdminDashboardPage />
      </AdminRoute>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
];

export default routes;
