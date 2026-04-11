export interface CalendarEvent {
  id?: number;
  title?: string;
  startDateTime?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
  capacity?: number;
  availablePlaces?: number;
  remindEnabled?: boolean;
  userId?: number;
}