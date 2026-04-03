export interface CalendarEvent {
  id?: number;
  title?: string;
  startDateTime?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
  remindEnabled?: boolean;
  userId?: number;
}