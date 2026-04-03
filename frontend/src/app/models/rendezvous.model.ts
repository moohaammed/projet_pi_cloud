export type StatutRendezVous = 'PLANIFIE' | 'CONFIRME' | 'ANNULE' | 'TERMINE';

export interface RendezVous {
  id?: number;
  patientId: number;
  medecinId: number;
  dateHeure: string; // ISO string
  motif: string;
  observations?: string;
  statut?: StatutRendezVous;
}
