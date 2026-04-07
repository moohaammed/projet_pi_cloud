export enum SeatStatus {
  FREE = 'FREE',
  BOOKED = 'BOOKED'
}

export interface EventSeat {
  id: number;
  seatNumber: string;
  status: SeatStatus;
  bookedAt?: string;
  // Note: On évite de passer tout l'objet User pour des raisons de légèreté
  bookedBy?: {
    id: number;
    nom: string;
    prenom: string;
  };
}
