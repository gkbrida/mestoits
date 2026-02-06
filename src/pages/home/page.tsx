
import { useState } from 'react';
import Navbar from '../../components/feature/Navbar';
import SideMenu from '../../components/feature/SideMenu';
import Footer from '../../components/feature/Footer';
import HeroSection from './components/HeroSection';
import PriceChartSection from './components/PriceChartSection';
import EstimationSection from './components/EstimationSection';
import LatestListingsSection from './components/LatestListingsSection';
import PostListingSection from './components/PostListingSection';
import RentalManagementSection from './components/RentalManagementSection';

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <Navbar onMenuToggle={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="mt-16 md:mt-10">
        <HeroSection />
        <PriceChartSection />
        <EstimationSection />
        <LatestListingsSection />
        <PostListingSection />
        <RentalManagementSection />
      </main>

      <Footer />
    </div>
  );
}
