import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActivityModel } from '../../models/education/activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityService {

  private api = 'http://localhost:8080/api/activities';

  constructor(private http: HttpClient) {}

  getAll(): Observable<ActivityModel[]> {
    return this.http.get<ActivityModel[]>(this.api);
  }

  getById(id: number): Observable<ActivityModel> {
    return this.http.get<ActivityModel>(`${this.api}/${id}`);
  }

  getByType(type: string): Observable<ActivityModel[]> {
    return this.http.get<ActivityModel[]>(`${this.api}/type/${type}`);
  }

  getByStade(stade: string): Observable<ActivityModel[]> {
    return this.http.get<ActivityModel[]>(`${this.api}/stade/${stade}`);
  }

  getQuizForPatient(stade: string): Observable<ActivityModel[]> {
    return this.http.get<ActivityModel[]>(`${this.api}/quiz-patient/${stade}`);
  }

  create(activity: ActivityModel): Observable<ActivityModel> {
    return this.http.post<ActivityModel>(this.api, activity);
  }

  update(id: number, activity: ActivityModel): Observable<ActivityModel> {
    return this.http.put<ActivityModel>(`${this.api}/${id}`, activity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}