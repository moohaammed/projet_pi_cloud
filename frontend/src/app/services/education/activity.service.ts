import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActivityModel } from '../../models/education/activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityService {

  private api = `${environment.apiUrl}/api/activities`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ActivityModel[]> {
    return this.http.get<ActivityModel[]>(this.api);
  }

  getById(id: string): Observable<ActivityModel> {
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

  update(id: string, activity: ActivityModel): Observable<ActivityModel> {
    return this.http.put<ActivityModel>(`${this.api}/${id}`, activity);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}