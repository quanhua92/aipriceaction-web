import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Brain, BarChart3, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export function HeroCTACarousel() {
  const { t } = useTranslation();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-rotate effect
  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 2);
    }, 3000);
    return () => clearInterval(interval);
  }, [isHovered]);

  const slides = [
    {
      id: 'ai',
      to: '/ai',
      icon: Brain,
      title: t('common.home.tryAIContext'),
      subtitle: t('common.home.aiContextShort'),
    },
    {
      id: 'play',
      to: '/play',
      icon: BarChart3,
      title: t('common.home.tryPlayground'),
      subtitle: t('common.home.playgroundShort'),
    },
  ];

  return (
    <div
      className="relative w-full max-w-md mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides Container */}
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${activeSlide * 100}%)` }}
        >
          {slides.map((slide) => {
            const SlideIcon = slide.icon;
            return (
              <div key={slide.id} className="w-full flex-shrink-0 px-4">
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {slide.subtitle}
                  </p>
                  <Link to={slide.to}>
                    <Button size="lg" className="w-full gap-2">
                      <SlideIcon className="h-5 w-5" />
                      {slide.title}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSlide(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              activeSlide === index
                ? 'bg-green-500 w-6'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}