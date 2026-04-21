export enum SeatStatus {
  FREE = 'FREE',
  BOOKED = 'BOOKED'
}

export interface EventSeat {
  id: string;
  seatNumber: string;
  status: SeatStatus;
  bookedAt?: string;
  bookedByUserId?: number;
}
