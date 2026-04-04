export type StatutRendezVous = 'PLANIFIE' | 'CONFIRME' | 'ANNULE' | 'TERMINE';

export interface RendezVous {
  id: number;
  patientId: number;
  medecinId: number;
  dateHeure: string;
  motif: string;
  observations?: string;
  statut?: StatutRendezVous;
  etat?: string;        // Pour l'affichage
  nomPatient?: string;  // Pour l'affichage
  medecinNom?: string;  // Pour l'affichage
  hopitalNom?: string;  // Pour l'affichage
}
