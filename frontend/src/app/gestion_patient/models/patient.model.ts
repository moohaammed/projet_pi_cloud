export interface Patient {
  id?: number;
  nom: string;
  prenom: string;
  age: number;
  poids: number;
  sexe: string;
  user_id?: number;
}

export interface Analyse {
  id?: number;
  date?: string;
  statut?: string;
  rapportMedical?: string;
  imageIRM?: string;
  scoreJeu?: number;
  pourcentageRisque?: number;
  interpretation?: string;
  observationMedicale?: string;
}

export interface NotificationPatient {
  id?: number;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  date: string;
  patientId?: number;
  patientNom?: string;
  read?: boolean;
}
