export enum RelationType {
  DOCTOR = 'DOCTOR',
  PARENT = 'PARENT',
  CAREGIVER = 'CAREGIVER',
  RELATION = 'RELATION'
}

export interface PatientContact {
  id?: number;
  patientUserId?: number;
  contactUserId?: number | null;
  relationType: RelationType;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  createdAt?: string;
}
