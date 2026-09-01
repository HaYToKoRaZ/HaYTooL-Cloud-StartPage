import { Storage } from './storage.js';
import { I18n } from './i18n.js';

/**
 * HaYTooL Cloud StartPage - Hava Durumu (Open-Meteo, ücretsiz)
 * Manuel şehir araması: Open-Meteo Geocoding API
 */
export const Weather = {
  async init() {
    const badge = document.getElementById('weatherBadge');
    if (!badge) return;
    badge.addEventListener('click', () => this.fetchAndRender(true));
    await this.fetchAndRender(false);
  },

  async fetchAndRender(forceRefresh) {
    const badge = document.getElementById('weatherBadge');
    if (!badge) return;

    const cached = await Storage.get('weather_cache', null);
    const now = Date.now();
    if (!forceRefresh && cached && (now - cached.timestamp < 30 * 60 * 1000)) {
      this.render(cached.data); return;
    }

    badge.innerHTML = '<span class="weather-icon">⏳</span><span>Yükleniyor...</span>';

    // Manuel şehir var mı?
    const manualCity = await Storage.get('weather_city', '');
    if (manualCity && manualCity.trim()) {
      await this.fetchByCity(manualCity.trim());
    } else {
      // GPS otomatik konum isteğini kaldırdık. Varsayılan şehir: İstanbul
      this.fetchWeather(41.0082, 28.9784, 'İstanbul');
    }
  },

  /** Şehir adını geocoding ile lat/lon'a çevirir */
  async fetchByCity(cityName) {
    try {
      const geo = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(cityName) + '&count=1&language=tr&format=json');
      if (!geo.ok) throw new Error('Geocoding API hatası');
      const geoData = await geo.json();
      if (!geoData.results || geoData.results.length === 0) throw new Error('"' + cityName + '" şehri bulunamadı');
      const { latitude, longitude, name, country } = geoData.results[0];
      await this.fetchWeather(latitude, longitude, name + ', ' + country);
    } catch(e) {
      console.warn('[Weather] Şehir araması başarısız:', e);
      // Fallback: İstanbul
      await this.fetchWeather(41.0082, 28.9784, 'İstanbul');
    }
  },

  async fetchWeather(lat, lon, cityName) {
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
                  '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Hava API hatası');
      const data = await res.json();
      const wd = {
        temp:     Math.round(data.current.temperature_2m),
        code:     data.current.weather_code,
        city:     cityName || 'Konumunuz',
        wind:     Math.round(data.current.wind_speed_10m),
        humidity: data.current.relative_humidity_2m
      };
      await Storage.set('weather_cache', { timestamp: Date.now(), data: wd });
      this.render(wd);
    } catch(e) {
      console.warn('[Weather] Hata:', e);
      const badge = document.getElementById('weatherBadge');
      if (badge) badge.innerHTML = '<span class="weather-icon">🌤️</span><span>--°C</span>';
    }
  },

  getIcon(code) {
    if (code === 0) return '☀️';
    if ([1,2].includes(code)) return '🌤️';
    if (code === 3) return '☁️';
    if ([45,48].includes(code)) return '🌫️';
    if ([51,53,55,61,63,65].includes(code)) return '🌧️';
    if ([71,73,75,77,85,86].includes(code)) return '❄️';
    if ([95,96,99].includes(code)) return '⛈️';
    return '⛅';
  },

  render(data) {
    const badge = document.getElementById('weatherBadge');
    if (!badge) return;
    const icon = this.getIcon(data.code);
    badge.innerHTML = '<span class="weather-icon">' + icon + '</span><span>' + data.temp + '°C <small style="opacity:.6;font-size:.8em">' + data.city + '</small></span>';
    badge.setAttribute('title', data.city + ' • 💧 %' + data.humidity + ' • 💨 ' + data.wind + ' km/s • Yenilemek için tıkla');
  }
};