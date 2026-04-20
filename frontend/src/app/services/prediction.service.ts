import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PredictionService {

  private apiUrl = 'http://localhost:8082/ai';

  constructor(private http: HttpClient) { }

  predict(data: any) {
    return this.http.post(`${this.apiUrl}/predict-cdr`, data);
  }

  predictRisk(data: any) {
    return this.http.post(`${this.apiUrl}/predict-risk`, data);
  }
}