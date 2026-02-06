
import { useState, useEffect } from 'react';

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      image: '/images/hero/hero-1.jpg',
    },
    {
      id: 2,
      image: '/images/hero/hero-2.jpg',
    },
    {
      id: 3,
      image: '/images/hero/hero-3.jpg',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <section className="relative min-h-[100vh] md:h-[100vh] overflow-hidden pt-16 md:pt-0">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-full py-8 md:py-0">
        <div className="flex flex-col md:flex-row items-center h-full gap-6 md:gap-12">
          {/* Left Content - Full width on mobile, 40% on desktop */}
          <div className="w-full md:w-[40%] z-10 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-[#0F172A] leading-tight mb-6 md:mb-12">
              Votre <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Immobilier</span><br />
              en Toute<br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Simplicité</span>
            </h1>
            <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-12 w-full md:w-[85%] leading-relaxed mx-auto md:mx-0">
              Découvrez les prix du marché, estimez votre bien gratuitement, trouvez votre propriété idéale et gérez vos locations en un seul endroit.
            </p>
            <div className="flex flex-col gap-3 md:gap-4">
              <a
                href="/estimation"
                className="inline-flex items-center justify-center px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm md:text-base font-semibold rounded-full shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all cursor-pointer whitespace-nowrap"
              >
                Estimer mon bien gratuitement
              </a>
              <a
                href="/recherche-biens"
                className="inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 border-2 border-gray-300 text-gray-700 text-sm md:text-base font-semibold rounded-full hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer whitespace-nowrap"
              >
                Explorer les annonces
                <i className="ri-arrow-right-line text-lg md:text-xl"></i>
              </a>
            </div>
          </div>

          {/* Right Carousel - Full width on mobile, 60% on desktop */}
          <div className="w-full md:w-[60%] h-[300px] md:h-[500px] lg:h-[600px] relative">
            <div className="relative w-full h-full rounded-3xl overflow-hidden">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-600 ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={`Propriété ${slide.id}`}
                    className="w-full h-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20"></div>
                </div>
              ))}

              {/* Navigation Arrows */}
              <button
                onClick={prevSlide}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all cursor-pointer"
                aria-label="Image précédente"
              >
                <i className="ri-arrow-left-s-line text-xl md:text-2xl text-gray-900"></i>
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all cursor-pointer"
                aria-label="Image suivante"
              >
                <i className="ri-arrow-right-s-line text-xl md:text-2xl text-gray-900"></i>
              </button>

              {/* Pagination Dots */}
              <div className="absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                      index === currentSlide ? 'bg-blue-600 w-8' : 'bg-gray-300'
                    }`}
                    aria-label={`Aller à l'image ${index + 1}`}
                  ></button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
