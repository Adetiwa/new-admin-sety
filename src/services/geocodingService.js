// Ported from estate/src/services/geocodingService.js — same Google Places +
// Nominatim address-autocomplete used on estate's organization onboarding.
import axios from 'axios';

/**
 * Frontend Geocoding Service
 *
 * Uses the Google Maps JavaScript SDK (dynamically loaded at runtime) to avoid
 * CORS restrictions on the Places web-service JSON endpoints.
 * Falls back to Nominatim when no API key is set or Google returns nothing.
 * Pass countryCode (ISO 3166-1 alpha-2) to restrict results; omit for global search.
 */

class GeocodingService {
  constructor() {
    this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
    this.googleApiKey     = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    this.requestCache     = new Map();
    this.cacheTimeout     = 5 * 60 * 1000;

    this._scriptLoaded    = false;
    this._scriptLoading   = false;
    this._scriptCallbacks = [];
  }

  // ── Public: autocomplete as user types ────────────────────────────────────

  async searchAddress(query, countryCode) {
    if (!query || query.length < 3) return [];

    const cacheKey = `search_${query}_${countryCode || 'global'}`;
    const cached   = this.getFromCache(cacheKey);
    if (cached) return cached;

    if (this.googleApiKey) {
      const [googleResult, nominatimResult] = await Promise.allSettled([
        this._googleAutocomplete(query, countryCode),
        this._nominatimSearch(query, countryCode),
      ]);
      const google    = googleResult.status    === 'fulfilled' ? (googleResult.value    || []) : [];
      const nominatim = nominatimResult.status === 'fulfilled' ? (nominatimResult.value || []) : [];
      const results   = google.length > 0 ? google : nominatim;
      if (results.length > 0) this.setCache(cacheKey, results);
      return results;
    }

    try {
      const results = await this._nominatimSearch(query, countryCode);
      if (results.length > 0) this.setCache(cacheKey, results);
      return results;
    } catch (err) {
      console.error('Nominatim search failed:', err.message);
      return [];
    }
  }

  // ── Public: geocode a full address object → coordinates ──────────────────

  async geocodeAddress(address) {
    const query = [address.street, address.city, address.state, address.country]
      .filter(Boolean).join(', ');
    if (!query) return null;

    const cacheKey = `geocode_${query}`;
    const cached   = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
        params: { q: query, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'Sety-Admin-App/1.0' },
        timeout: 5000,
      });
      if (response.data?.length > 0) {
        const r      = response.data[0];
        const coords = { lat: parseFloat(r.lat), lon: parseFloat(r.lon), display_name: r.display_name };
        this.setCache(cacheKey, coords);
        return coords;
      }
    } catch (err) {
      console.error('Nominatim geocode error:', err.message);
    }

    if (this.googleApiKey) return this._googleGeocode(query, cacheKey);
    return null;
  }

  // ── Load the Google Maps JavaScript SDK once ──────────────────────────────

  _loadGoogleScript() {
    return new Promise((resolve, reject) => {
      if (window.google?.maps?.places) { resolve(); return; }
      if (this._scriptLoaded)          { resolve(); return; }
      if (this._scriptLoading) {
        this._scriptCallbacks.push(resolve);
        return;
      }
      this._scriptLoading = true;
      const script    = document.createElement('script');
      script.src      = `https://maps.googleapis.com/maps/api/js?key=${this.googleApiKey}&libraries=places&language=en`;
      script.async    = true;
      script.defer    = true;
      script.onload   = () => {
        this._scriptLoaded  = true;
        this._scriptLoading = false;
        this._scriptCallbacks.forEach(cb => cb());
        this._scriptCallbacks = [];
        resolve();
      };
      script.onerror  = () => {
        this._scriptLoading = false;
        reject(new Error('Google Maps SDK failed to load'));
      };
      document.head.appendChild(script);
    });
  }

  // ── Google Places Autocomplete (JS SDK — no CORS) ─────────────────────────

  async _googleAutocomplete(query, countryCode) {
    try {
      await this._loadGoogleScript();
      const svc     = new window.google.maps.places.AutocompleteService();
      const request = { input: query, language: 'en' };
      if (countryCode) request.componentRestrictions = { country: countryCode };

      const predictions = await new Promise((resolve) => {
        svc.getPlacePredictions(request, (preds, status) => {
          const OK = window.google.maps.places.PlacesServiceStatus.OK;
          resolve(status === OK && preds ? preds : []);
        });
      });

      if (!predictions.length) return [];

      const resolved = await Promise.all(
        predictions.slice(0, 5).map(p => this._resolvePlaceDetails(p))
      );
      return resolved.filter(Boolean);
    } catch (err) {
      console.error('Google Autocomplete error:', err.message);
      return [];
    }
  }

  // ── Google Place Details (JS SDK) ─────────────────────────────────────────

  _resolvePlaceDetails(prediction) {
    const cacheKey = `place_${prediction.place_id}`;
    const cached   = this.getFromCache(cacheKey);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
      const container = document.createElement('div');
      const svc       = new window.google.maps.places.PlacesService(container);
      svc.getDetails(
        { placeId: prediction.place_id, fields: ['formatted_address', 'geometry', 'address_components', 'types'] },
        (place, status) => {
          const OK = window.google.maps.places.PlacesServiceStatus.OK;
          if (status !== OK || !place) { resolve(null); return; }

          const ac = {};
          (place.address_components || []).forEach(comp => {
            if (comp.types.includes('route'))                                    ac.street      = comp.long_name;
            if (comp.types.includes('locality'))                                 ac.city        = comp.long_name;
            if (comp.types.includes('sublocality_level_1') && !ac.city)         ac.city        = comp.long_name;
            if (comp.types.includes('sublocality') && !ac.city)                 ac.city        = comp.long_name;
            if (comp.types.includes('administrative_area_level_2') && !ac.city) ac.city        = comp.long_name;
            if (comp.types.includes('administrative_area_level_1'))             ac.state       = comp.long_name;
            if (comp.types.includes('country'))                                  ac.country     = comp.long_name;
            if (comp.types.includes('postal_code'))                              ac.postal_code = comp.long_name;
            if (comp.types.includes('neighborhood') && !ac.street)              ac.street      = comp.long_name;
            if (comp.types.includes('premise') && !ac.street)                   ac.street      = comp.long_name;
          });

          const result = {
            id:           prediction.place_id,
            display_name: place.formatted_address || prediction.description,
            address: {
              street:      ac.street      || '',
              city:        ac.city        || '',
              state:       ac.state       || '',
              country:     ac.country     || '',
              postal_code: ac.postal_code || '',
            },
            coordinates: {
              lat: place.geometry?.location?.lat() || 0,
              lon: place.geometry?.location?.lng() || 0,
            },
            type:   (place.types || [])[0] || 'address',
            source: 'google',
          };
          this.setCache(cacheKey, result);
          resolve(result);
        }
      );
    });
  }

  // ── Google Geocoding (JS SDK) ─────────────────────────────────────────────

  async _googleGeocode(query, cacheKey) {
    try {
      await this._loadGoogleScript();
      const geocoder = new window.google.maps.Geocoder();
      return new Promise((resolve) => {
        geocoder.geocode({ address: query }, (results, status) => {
          if (status === 'OK' && results.length > 0) {
            const r      = results[0];
            const coords = { lat: r.geometry.location.lat(), lon: r.geometry.location.lng(), display_name: r.formatted_address };
            if (cacheKey) this.setCache(cacheKey, coords);
            resolve(coords);
          } else {
            resolve(null);
          }
        });
      });
    } catch (err) {
      console.error('Google Geocoding error:', err.message);
      return null;
    }
  }

  // ── Nominatim ────────────────────────────────────────────────────────────

  async _nominatimSearch(query, countryCode) {
    const params = { q: query, format: 'json', addressdetails: 1, limit: 5 };
    if (countryCode) params.countrycodes = countryCode;

    const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
      params,
      headers: { 'User-Agent': 'Sety-Admin-App/1.0' },
      timeout: 5000,
    });

    return (response.data || []).map(item => ({
      id:           item.place_id,
      display_name: item.display_name,
      address: {
        street:      item.address.road || item.address.neighbourhood || item.address.suburb || '',
        city:        item.address.city || item.address.town          || item.address.village || '',
        state:       item.address.state   || '',
        country:     item.address.country || '',
        postal_code: item.address.postcode || '',
      },
      coordinates: {
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      },
      type:       item.type,
      importance: item.importance,
      source:     'nominatim',
    }));
  }

  // ── Cache ─────────────────────────────────────────────────────────────────

  setCache(key, value) {
    this.requestCache.set(key, { value, timestamp: Date.now() });
  }

  getFromCache(key) {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) return cached.value;
    this.requestCache.delete(key);
    return null;
  }

  clearCache() { this.requestCache.clear(); }
}

export default new GeocodingService();
