import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { HospitalPrediction, HospitalPredictionService, RecommendedHospital } from '../../services/hospital-prediction.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-hospital-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hospital-map.component.html',
  styleUrl: './hospital-map.component.css'
})
export class HospitalMapComponent implements AfterViewInit, OnDestroy {
  prediction: HospitalPrediction | null = null;
  loading = true;
  error = '';
  private map: any;
  private isBrowser: boolean;

  constructor(
    private hospitalPredictionService: HospitalPredictionService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.hospitalPredictionService.latest().subscribe({
      next: (data) => {
        this.prediction = data?.[0] || null;
        this.loading = false;
        if (this.prediction) {
          setTimeout(() => this.drawMap(), 0);
        }
      },
      error: () => {
        this.error = 'Impossible de charger la carte hospitaliere.';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private drawMap(): void {
    if (!this.prediction || typeof L === 'undefined') {
      this.error = 'Leaflet est indisponible.';
      return;
    }

    this.map = L.map('hospitalPredictionMap').setView(
      [this.prediction.patientLatitude, this.prediction.patientLongitude],
      12
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    const patientIcon = L.divIcon({
      className: '',
      html: '<div class="map-pin patient-pin"><i class="fa-solid fa-person"></i></div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    L.marker([this.prediction.patientLatitude, this.prediction.patientLongitude], { icon: patientIcon })
      .bindPopup('Position patient')
      .addTo(this.map);

    const bounds = L.latLngBounds([[this.prediction.patientLatitude, this.prediction.patientLongitude]]);
    this.prediction.hopitaux.forEach((hospital, index) => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="map-pin ${index === 0 ? 'recommended-pin' : 'hospital-pin'}"><i class="fa-solid fa-hospital"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      L.marker([hospital.latitude, hospital.longitude], { icon })
        .bindPopup(this.popupHtml(hospital, index === 0))
        .addTo(this.map);
      bounds.extend([hospital.latitude, hospital.longitude]);
    });

    this.map.fitBounds(bounds, { padding: [40, 40] });
  }

  private popupHtml(hospital: RecommendedHospital, recommended: boolean): string {
    const distance = hospital.distanceKm || hospital.distance_km || '';
    return `
      <strong>${hospital.nom}</strong><br>
      ${recommended ? '<span style="color:#198754;font-weight:700">RECOMMANDE</span><br>' : ''}
      ${hospital.specialite} - ${distance} km<br>
      ${hospital.telephone}<br>
      <a target="_blank" href="https://www.google.com/maps?q=${hospital.latitude},${hospital.longitude}">Voir Google Maps</a>
    `;
  }
}
