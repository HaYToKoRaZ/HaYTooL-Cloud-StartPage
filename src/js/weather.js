import { Storage } from './storage.js';
import { Settings } from './settings.js';

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

    // Settings initialize edildiği için Settings.config yüklü
    const cityObj = Settings.config.weatherCityObj;
    const currentCityName = cityObj?.name || 'İstanbul';

    const cached = await Storage.get('weather_cache', null);
    const now = Date.now();

    // Önbellek yalnızca aynı şehir için ve 30 dakikadan yeniyse geçerlidir
    if (!forceRefresh && cached && cached.data && cached.data.city === currentCityName && (now - cached.timestamp < 30 * 60 * 1000)) {
      this.render(cached.data);
      return;
    }

    badge.innerHTML = '<span class="weather-icon">⏳</span><span>Yükleniyor...</span>';

    const lat = parseFloat(cityObj?.lat);
    const lon = parseFloat(cityObj?.lon);
    const hasValidCoords = !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

    if (hasValidCoords) {
      await this.fetchWeather(lat, lon, cityObj.name || 'Konum');
    } else {
      // Varsayılan: İstanbul (41.0082, 28.9784)
      await this.fetchWeather(41.0082, 28.9784, 'İstanbul');
    }
  },

  async fetchWeather(lat, lon, cityName) {
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(lat) +
                  '&longitude=' + encodeURIComponent(lon) +
                  '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Hava API yanıt vermedi (HTTP ' + res.status + ')');
      const data = await res.json();
      
      if (!data || !data.current || typeof data.current.temperature_2m !== 'number') {
        throw new Error('Geçersiz veya eksik hava durumu verisi');
      }

      const wd = {
        temp:     Math.round(data.current.temperature_2m),
        code:     data.current.weather_code ?? 0,
        city:     cityName || 'Konum',
        wind:     Math.round(data.current.wind_speed_10m ?? 0),
        humidity: Math.round(data.current.relative_humidity_2m ?? 0)
      };

      await Storage.set('weather_cache', { timestamp: Date.now(), data: wd });
      this.render(wd);
    } catch(e) {
      console.warn('[Weather] Hata:', e.message || e);
      
      // Hata durumunda önbellekte eski veri varsa onu göster
      const cached = await Storage.get('weather_cache', null);
      if (cached && cached.data) {
        this.render(cached.data);
      } else {
        const badge = document.getElementById('weatherBadge');
        if (badge) {
          badge.innerHTML = '<div class="weather-badge-top">' +
            '<span class="weather-icon">🌤️</span>' +
            '<span>--°C <small style="opacity:.6;font-size:.8em">' + (cityName || 'Konum') + '</small></span>' +
          '</div>';
        }
      }
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
    const badge = document.getElementById("weatherBadge");
    if (!badge) return;
    const icon = this.getIcon(data.code);
    badge.innerHTML = `
      <div class="weather-badge-top">
        <span class="weather-icon">${icon}</span>
        <span>${data.temp}°C <small style="opacity:.6;font-size:.8em">${data.city}</small></span>
      </div>
      <div class="weather-badge-bottom">
        <span>💧 %${data.humidity}</span>
        <span>🌬️ ${data.wind} km/s</span>
      </div>
    `;
    badge.setAttribute("title", "Yenilemek için tıkla");
  }
};
