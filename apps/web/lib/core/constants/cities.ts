export interface City {
  id: string
  name: string
  department: string
  center: [number, number] // [lat, lng]
  timezone: string
}

export const COLOMBIA_CITIES: City[] = [
  {
    id: 'bogota',
    name: 'Bogotá',
    department: 'Cundinamarca',
    center: [4.6097, -74.0817],
    timezone: 'America/Bogota',
  },
  {
    id: 'medellin',
    name: 'Medellín',
    department: 'Antioquia',
    center: [6.2476, -75.5658],
    timezone: 'America/Bogota',
  },
  {
    id: 'cali',
    name: 'Cali',
    department: 'Valle del Cauca',
    center: [3.4516, -76.5320],
    timezone: 'America/Bogota',
  },
  {
    id: 'barranquilla',
    name: 'Barranquilla',
    department: 'Atlántico',
    center: [10.9685, -74.7813],
    timezone: 'America/Bogota',
  },
  {
    id: 'cartagena',
    name: 'Cartagena',
    department: 'Bolívar',
    center: [10.3910, -75.4794],
    timezone: 'America/Bogota',
  },
  {
    id: 'bucaramanga',
    name: 'Bucaramanga',
    department: 'Santander',
    center: [7.1193, -73.1227],
    timezone: 'America/Bogota',
  },
  {
    id: 'cucuta',
    name: 'Cúcuta',
    department: 'Norte de Santander',
    center: [7.8890, -72.4947],
    timezone: 'America/Bogota',
  },
  {
    id: 'pereira',
    name: 'Pereira',
    department: 'Risaralda',
    center: [4.8133, -75.6961],
    timezone: 'America/Bogota',
  },
  {
    id: 'ibague',
    name: 'Ibagué',
    department: 'Tolima',
    center: [4.4389, -75.2324],
    timezone: 'America/Bogota',
  },
  {
    id: 'manizales',
    name: 'Manizales',
    department: 'Caldas',
    center: [5.0689, -75.5174],
    timezone: 'America/Bogota',
  },
  {
    id: 'santa-marta',
    name: 'Santa Marta',
    department: 'Magdalena',
    center: [11.2408, -74.2099],
    timezone: 'America/Bogota',
  },
  {
    id: 'villavicencio',
    name: 'Villavicencio',
    department: 'Meta',
    center: [4.1420, -73.6347],
    timezone: 'America/Bogota',
  },
  {
    id: 'pasto',
    name: 'Pasto',
    department: 'Nariño',
    center: [1.2051, -77.2666],
    timezone: 'America/Bogota',
  },
  {
    id: 'neiva',
    name: 'Neiva',
    department: 'Huila',
    center: [2.5273, -75.2879],
    timezone: 'America/Bogota',
  },
  {
    id: 'armenia',
    name: 'Armenia',
    department: 'Quindío',
    center: [4.5333, -75.6833],
    timezone: 'America/Bogota',
  },
  {
    id: 'sincelejo',
    name: 'Sincelejo',
    department: 'Sucre',
    center: [9.3047, -75.3978],
    timezone: 'America/Bogota',
  },
  {
    id: 'tunja',
    name: 'Tunja',
    department: 'Boyacá',
    center: [5.5353, -73.3678],
    timezone: 'America/Bogota',
  },
  {
    id: 'riohacha',
    name: 'Riohacha',
    department: 'La Guajira',
    center: [11.5447, -72.9072],
    timezone: 'America/Bogota',
  },
]

export const DEFAULT_CITY = COLOMBIA_CITIES[0]

export function getCityById(id: string): City | undefined {
  return COLOMBIA_CITIES.find((c) => c.id === id)
}
