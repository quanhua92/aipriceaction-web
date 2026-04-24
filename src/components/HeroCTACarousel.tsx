import { useState, useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Brain, BarChart3, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export function HeroCTACarousel() {
  const { t } = useTranslation();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Auto-rotate effect
  useEffect(() => {
    if (isHovered || isTouching) return;

    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 2);
    }, 3000);
    return () => clearInterval(interval);
  }, [isHovered, isTouching]);

  // Swipe gesture handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsTouching(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    setIsTouching(false);

    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setActiveSlide((prev) => (prev + 1) % 2);
    }
    if (isRightSwipe) {
      setActiveSlide((prev) => (prev - 1 + 2) % 2);
    }
  };

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
      to: '/backtesting',
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
      <div
        ref={sliderRef}
        className="overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
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
                    <Button variant="outline" size="lg" className="w-full gap-2">
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