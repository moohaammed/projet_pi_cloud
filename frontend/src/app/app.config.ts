import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
<<<<<<< rendezvous

=======
>>>>>>> main
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
<<<<<<< rendezvous
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
=======
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
>>>>>>> main
    provideClientHydration(),
    provideHttpClient(withFetch())
  ]
};
