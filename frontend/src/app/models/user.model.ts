export enum Role {
  ADMIN    = 'ADMIN',
  DOCTOR   = 'DOCTOR',
  PATIENT  = 'PATIENT',
  RELATION = 'RELATION'
}

export interface User {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  password?: string;
  telephone?: string;
  image?: string;
  role: Role;
  actif: boolean;
  createdAt?: string;
}