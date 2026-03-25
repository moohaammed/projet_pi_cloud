import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Publication {
  id?: number;
  content: string;
  mediaUrl?: string;
  mimeType?: string;
  type?: string;
  createdAt?: string;
  author?: any;
  isDistressed?: boolean;
  comments?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class PublicationService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8080/api/publications';

  public publications = signal<Publication[]>([]);

  fetchPublications() {
    this.http.get<Publication[]>(this.baseUrl).subscribe(res => {
      console.log("DEBUG [Feed]: Loaded publications. Count:", res?.length);
      if (res && res.length > 0) {
          console.log("DEBUG [Feed]: First item distressed flag:", res[0].isDistressed);
      }
      this.publications.set(res);
    });
  }

  createPublication(formData: FormData) {
    this.http.post<Publication>(this.baseUrl, formData).subscribe(() => {
      this.fetchPublications();
    });
  }
}
