export interface ServiceLocation {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  serviceRadius: number;
  serviceRadiusUnit: "km" | "mi";
}
