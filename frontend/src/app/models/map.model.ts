export interface PatientLocation {
  id?: number;
  patientId: number;
  latitude: number;
  longitude: number;
  batterie?: number;
  timestamp?: string;
}

export interface SafeZone {
  id?: number;
  patientId: number;
  doctorId: number;
  nom?: string;
  latitudeCentre: number;
  longitudeCentre: number;
  rayonVert: number;
  rayonRouge: number;
  actif: boolean;
}

export interface GeoAlert {
  id?: number;
  patientId: number;
  typeAlerte: 'HORS_ZONE_VERTE' | 'HORS_ZONE_ROUGE' | 'BATTERIE_FAIBLE' | 'SOS';
  latitude?: number;
  longitude?: number;
  message?: string;
  resolue: boolean;
  declencheeAt?: string;
}