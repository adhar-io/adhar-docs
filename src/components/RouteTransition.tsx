import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteTransitionProps {
  children: ReactNode;
}

const RouteTransition = ({ children }: RouteTransitionProps) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState<'fadeIn' | 'fadeOut'>('fadeIn');

  useEffect(() => {
    if (location !== displayLocation) {
      setTransitionStage('fadeOut');
    }
  }, [location, displayLocation]);

  const handleAnimationEnd = () => {
    if (transitionStage === 'fadeOut') {
      setDisplayLocation(location);
      setTransitionStage('fadeIn');
    }
  };

  return (
    <div
      className={`${
        transitionStage === 'fadeIn' ? 'animate-fade-in' : 'animate-fade-out'
      }`}
      onAnimationEnd={handleAnimationEnd}
    >
      {children}
    </div>
  );
};

export default RouteTransition;
