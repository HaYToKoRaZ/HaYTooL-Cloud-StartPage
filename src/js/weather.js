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

    if (cityObj && cityObj.lat !== undefined && cityObj.lon !== undefined) {
      await this.fetchWeather(cityObj.lat, cityObj.lon, cityObj.name);
    } else {
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
        city:     cityName || 'Konum',
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
