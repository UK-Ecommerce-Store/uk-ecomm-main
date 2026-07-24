export const SURAT_SERVICE_AREA = {
  city: "Surat",
  state: "Gujarat",
  center: [21.1702, 72.8311] as [number, number],
  bounds: {
    minLat: 21.02,
    maxLat: 21.34,
    minLng: 72.68,
    maxLng: 73.02,
  },
};

export function isSuratPostalCode(postalCode: string) {
  return /^(394|395)\d{3}$/.test(postalCode.trim());
}

export function isInsideSurat(latitude: number, longitude: number) {
  const { minLat, maxLat, minLng, maxLng } = SURAT_SERVICE_AREA.bounds;
  return latitude >= minLat && latitude <= maxLat && longitude >= minLng && longitude <= maxLng;
}
