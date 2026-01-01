// Mathematical calculations for GPS
export function haversineDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in kilometers
  const toRad = deg => deg * Math.PI / 180;
  
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);
  
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) * 
            Math.sin(dLng / 2) ** 2;
  
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function calculateBearing(coord1, coord2) {
  const toRad = deg => deg * Math.PI / 180;
  const toDeg = rad => rad * 180 / Math.PI;
  
  const lat1 = toRad(coord1.lat);
  const lat2 = toRad(coord2.lat);
  const deltaLng = toRad(coord2.lng - coord1.lng);
  
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  
  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

export function formatDistance(distanceKm) {
  if (distanceKm < 0.001) {
    return '0 m';
  } else if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  } else {
    return `${distanceKm.toFixed(2)} km`;
  }
}

export function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}