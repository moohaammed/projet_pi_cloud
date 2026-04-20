import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClipPrediction {
  label: string;
  score: number;
}

export interface ClipResult {
  predictions: ClipPrediction[];
  message: string;
  danger: boolean;
}

@Injectable({ providedIn: 'root' })
export class ClipService {
  private readonly fastApiUrl = 'http://localhost:8000/predict';

  constructor(private http: HttpClient) {}

  /**
   * Sends a base64 image to FastAPI CLIP server.
   * @param base64Image Full data-URL or raw base64 string.
   */
  analyzeImage(base64Image: string): Observable<ClipResult> {
    return this.http.post<ClipResult>(this.fastApiUrl, { inputs: base64Image });
  }
}