import { useRef } from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const HeroCarousel = () => {
  const plugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: true }));

  return (
    <Carousel
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
    >
      <CarouselContent>
        <CarouselItem>
          <img
              className="w-full h-full object-cover rounded-lg"
              src="/assets/imgs/Christina Deravedisian Unsplash.jpg"
              alt="Adhar Platform"
          />
        </CarouselItem>
        <CarouselItem>
          <img
              className="w-full h-full object-cover rounded-lg"
              src="/assets/imgs/beautiful-designs.jpg"
              alt="Design"
          />
        </CarouselItem>
        <CarouselItem>
          <img
              className="w-full h-full object-cover rounded-lg"
              src="/assets/imgs/Fabian Irsara Unsplash.jpg"
              alt="Governance"
          />
        </CarouselItem>
        <CarouselItem>
          <img
              className="w-full h-full object-cover rounded-lg"
              src="/assets/imgs/developer.jpg"
              alt="Develop"
          />
        </CarouselItem>
        <CarouselItem>
          <img
              className="w-full h-full object-cover rounded-lg"
              src="/assets/imgs/paved-road.jpg"
              alt="Paved Road"
          />
        </CarouselItem> 
        <CarouselItem>
          <img
              className="w-full h-full object-cover rounded-lg"
              src="/assets/imgs/data-analytics.jpg"
              alt="Data Analytics"
          />
        </CarouselItem>
        <CarouselItem>
          <img
              className="w-full h-full object-cover rounded-lg"
              src="/assets/imgs/team.jpg"
              alt="Team Empowerment"
          />
        </CarouselItem>    
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
};

export default HeroCarousel;
