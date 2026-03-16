'use client';

import { useEffect, useState } from 'react';

const GPS_OPTIONAL_MIN_WIDTH = 1536;

// GPS is mandatory on medium/small screens (phones, tablets, most laptops),
// optional only on very large desktop screens.
export const useGpsRequired = () => {
  const [gpsRequired, setGpsRequired] = useState(true);

  useEffect(() => {
    const update = () => {
      setGpsRequired(window.innerWidth < GPS_OPTIONAL_MIN_WIDTH);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return gpsRequired;
};
