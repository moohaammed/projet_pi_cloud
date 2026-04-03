export interface Hospital {
  id?: number;
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  siteWeb?: string;
  description?: string;
  ville: string;
  rating?: number;
  nombreAvis?: number;
  latitude?: number;
  longitude?: number;
}