// GPS utilities
export function getCurrentPosition(options = {}) {
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
    ...options
  };

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, defaultOptions);
  });
}

export async function getElevation(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`;
    const response = await fetch(url);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (Array.isArray(data.elevation) && data.elevation.length > 0) {
      return data.elevation[0];
    }
    
    return null;
  } catch (error) {
    console.warn('Elevation fetch failed:', error);
    return null;
  }
}

export function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function isValidCoordinate(coord) {
  return coord && 
         typeof coord.lat === 'number' && 
         typeof coord.lng === 'number' &&
         coord.lat >= -90 && coord.lat <= 90 &&
         coord.lng >= -180 && coord.lng <= 180;
}