export interface GeoPoint {
  lat: number;
  lng: number;
}

export const geocodeAddress = async (address: string): Promise<GeoPoint | null> => {
  const query = address.trim();
  if (!query) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    if (!first?.lat || !first?.lon) return null;
    return { lat: Number(first.lat), lng: Number(first.lon) };
  } catch (error) {
    console.error('Unable to geocode address:', error);
    return null;
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.display_name === 'string' ? data.display_name : null;
  } catch (error) {
    console.error('Unable to reverse geocode:', error);
    return null;
  }
};

