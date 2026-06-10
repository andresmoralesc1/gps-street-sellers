/**
 * Calcula distancia entre dos puntos usando fórmula de Haversine
 * @returns distancia en metros
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Radio de la Tierra en metros
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Filtra vendedores por distancia máxima
 */
export function filterByDistance<T extends { lat: number; lng: number }>(
  items: T[],
  userLat: number,
  userLng: number,
  maxDistanceMeters: number
): T[] {
  return items.filter(item => {
    const dist = calculateDistance(userLat, userLng, item.lat, item.lng)
    return dist <= maxDistanceMeters
  })
}