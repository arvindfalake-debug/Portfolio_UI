(function () {
  'use strict';

  /* ---------- Settings ---------- */
  var GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  var FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
  var PLACE_KEY = 'weather-app-place';
  var UNIT_KEY = 'weather-app-unit';

  // Open-Meteo "weather codes" -> [icon type, description]
  var WEATHER_CODES = {
    0: ['clear', 'Clear sky'],
    1: ['clear', 'Mainly clear'],
    2: ['partly', 'Partly cloudy'],
    3: ['cloudy', 'Overcast'],
    45: ['fog', 'Fog'],
    48: ['fog', 'Freezing fog'],
    51: ['rain', 'Light drizzle'],
    53: ['rain', 'Drizzle'],
    55: ['rain', 'Heavy drizzle'],
    56: ['rain', 'Freezing drizzle'],
    57: ['rain', 'Freezing drizzle'],
    61: ['rain', 'Light rain'],
    63: ['rain', 'Rain'],
    65: ['rain', 'Heavy rain'],
    66: ['rain', 'Freezing rain'],
    67: ['rain', 'Freezing rain'],
    71: ['snow', 'Light snow'],
    73: ['snow', 'Snow'],
    75: ['snow', 'Heavy snow'],
    77: ['snow', 'Snow grains'],
    80: ['rain', 'Light showers'],
    81: ['rain', 'Showers'],
    82: ['rain', 'Heavy showers'],
    85: ['snow', 'Snow showers'],
    86: ['snow', 'Heavy snow showers'],
    95: ['storm', 'Thunderstorm'],
    96: ['storm', 'Thunderstorm with hail'],
    99: ['storm', 'Thunderstorm with hail']
  };

  /* ---------- Elements ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var form = $('search-form');
  var cityInput = $('city');
  var locateBtn = $('locate');
  var matchesEl = $('matches');
  var statusEl = $('status');
  var nowEl = $('now');
  var forecastEl = $('forecast');
  var daysEl = $('days');
  var unitBtns = document.querySelectorAll('[data-unit]');

  /* ---------- State ---------- */
  var unit = readStorage(UNIT_KEY) === 'f' ? 'f' : 'c';
  var place = null;       // { name, region, latitude, longitude }
  var weather = null;     // data from the forecast API
  var matches = [];       // places found by a search
  var controller = null;  // lets us cancel an old request
  var requestId = 0;

  /* ---------- Storage ---------- */
  function readStorage(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
  }

  /* ---------- Icons (inline SVG) ---------- */
  var SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315].map(function (deg) {
    return '<line x1="32" y1="6" x2="32" y2="13" transform="rotate(' + deg + ' 32 32)"/>';
  }).join('');

  function sun(cx, cy, scale) {
    return '<g transform="translate(' + cx + ' ' + cy + ') scale(' + scale + ') translate(-32 -32)">' +
      '<g stroke="#F59E0B" stroke-width="4" stroke-linecap="round">' + SUN_RAYS + '</g>' +
      '<circle cx="32" cy="32" r="13" fill="#FBBF24"/></g>';
  }

  function moon(cx, cy, scale) {
    return '<g transform="translate(' + cx + ' ' + cy + ') scale(' + scale + ') translate(-32 -32)">' +
      '<path d="M40 10a22 22 0 1 0 14 38A18 18 0 0 1 40 10z" fill="#E7E2C4"/></g>';
  }

  function cloudShape(fill) {
    return '<g fill="' + fill + '">' +
      '<circle cx="21" cy="40" r="9"/><circle cx="32" cy="32" r="12"/><circle cx="45" cy="38" r="10"/>' +
      '<rect x="21" y="38" width="24" height="11"/></g>';
  }

  function drops() {
    return '<g stroke="#2F7DE1" stroke-width="3.5" stroke-linecap="round">' +
      '<line x1="24" y1="54" x2="21" y2="60"/><line x1="34" y1="54" x2="31" y2="60"/><line x1="44" y1="54" x2="41" y2="60"/></g>';
  }

  function flakes() {
    return '<g fill="#7FB4EA"><circle cx="24" cy="56" r="2.6"/><circle cx="34" cy="58" r="2.6"/><circle cx="44" cy="56" r="2.6"/></g>';
  }

  function bolt() {
    return '<polygon points="35,46 26,58 33,58 30,66 42,52 35,52 38,46" fill="#FBBF24"/>';
  }

  function fogLines() {
    return '<g stroke="#8B98AA" stroke-width="3.5" stroke-linecap="round">' +
      '<line x1="14" y1="54" x2="50" y2="54"/><line x1="20" y1="61" x2="56" y2="61"/></g>';
  }

  function icon(type, isDay) {
    var body;
    var light = isDay ? sun : moon;
    switch (type) {
      case 'clear':  body = light(32, 32, 1.1); break;
      case 'partly': body = light(24, 24, 0.75) + '<g transform="translate(6 4)">' + cloudShape('#B7C3D6') + '</g>'; break;
      case 'cloudy': body = '<g transform="translate(0 4)">' + cloudShape('#A9B7CC') + '</g>'; break;
      case 'fog':    body = '<g transform="translate(0 -6)">' + cloudShape('#B7C3D6') + '</g>' + fogLines(); break;
      case 'rain':   body = '<g transform="translate(0 -6)">' + cloudShape('#8797AE') + '</g>' + drops(); break;
      case 'snow':   body = '<g transform="translate(0 -6)">' + cloudShape('#A9B7CC') + '</g>' + flakes(); break;
      case 'storm':  body = '<g transform="translate(0 -8)">' + cloudShape('#6E7C93') + '</g>' + bolt(); break;
      default:       body = cloudShape('#A9B7CC');
    }
    return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" focusable="false">' + body + '</svg>';
  }

  /* ---------- Formatting ---------- */
  function describe(code) {
    return WEATHER_CODES[code] || ['cloudy', 'Unknown'];
  }

  function temp(celsius) {
    var value = unit === 'f' ? celsius * 9 / 5 + 32 : celsius;
    return Math.round(value) + '°';
  }

  function windSpeed(kmh) {
    return unit === 'f' ? Math.round(kmh / 1.609) + ' mph' : Math.round(kmh) + ' km/h';
  }

  function placeRegion(p) {
    return [p.admin1 && p.admin1 !== p.name ? p.admin1 : '', p.country].filter(Boolean).join(', ');
  }

  // "2026-10-25T14:15" is already the local time of the place
  function localTimeText(isoString) {
    var d = new Date(isoString);
    if (isNaN(d)) return '';
    var day = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    var time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    return day + ', ' + time + ' local time';
  }

  function dayName(dateString, index) {
    if (index === 0) return 'Today';
    var parts = dateString.split('-');
    var d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }

  /* ---------- Status messages ---------- */
  function setStatus(message, isError) {
    statusEl.textContent = message || '';
    statusEl.classList.toggle('status--error', !!isError);
  }

  /* ---------- Network ---------- */
  function getJson(url, signal) {
    return fetch(url, { signal: signal }).then(function (response) {
      if (!response.ok) throw new Error('Request failed: ' + response.status);
      return response.json();
    });
  }

  function newRequest() {
    if (controller) controller.abort();
    controller = new AbortController();
    requestId += 1;
    return { id: requestId, signal: controller.signal };
  }

  function networkMessage() {
    return "Couldn't load the weather. Check your internet connection and try again.";
  }

  /* ---------- Search a city ---------- */
  function searchCity(query) {
    var req = newRequest();
    hideMatches();
    setStatus('Searching for “' + query + '”…');

    var url = GEOCODING_URL + '?name=' + encodeURIComponent(query) + '&count=5&language=en&format=json';
    getJson(url, req.signal).then(function (data) {
      if (req.id !== requestId) return;
      var results = (data && data.results) || [];

      if (results.length === 0) {
        setStatus('No city found for “' + query + '”. Check the spelling or try a bigger city nearby.', true);
        return;
      }
      if (results.length === 1) {
        loadWeather(toPlace(results[0]));
        return;
      }
      showMatches(results.map(toPlace));
    }).catch(function (error) {
      if (error.name === 'AbortError') return;
      setStatus(networkMessage(), true);
    });
  }

  function toPlace(result) {
    return {
      name: result.name,
      region: placeRegion(result),
      latitude: result.latitude,
      longitude: result.longitude
    };
  }

  function showMatches(list) {
    matches = list;
    matchesEl.innerHTML = '';
    list.forEach(function (p, index) {
      var li = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'matches__btn';
      button.setAttribute('data-index', index);

      var name = document.createElement('span');
      name.className = 'matches__name';
      name.textContent = p.name;
      var where = document.createElement('span');
      where.className = 'matches__where';
      where.textContent = p.region ? ' · ' + p.region : '';

      button.appendChild(name);
      button.appendChild(where);
      li.appendChild(button);
      matchesEl.appendChild(li);
    });
    matchesEl.hidden = false;
    setStatus('Several places match. Choose one:');
  }

  function hideMatches() {
    matchesEl.hidden = true;
    matchesEl.innerHTML = '';
    matches = [];
  }

  /* ---------- Load the weather ---------- */
  function loadWeather(p) {
    var req = newRequest();
    hideMatches();
    setStatus('Loading weather for ' + p.name + '…');

    var url = FORECAST_URL +
      '?latitude=' + encodeURIComponent(p.latitude) +
      '&longitude=' + encodeURIComponent(p.longitude) +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      '&timezone=auto&forecast_days=5';

    getJson(url, req.signal).then(function (data) {
      if (req.id !== requestId) return;
      if (!data || !data.current || !data.daily) throw new Error('Unexpected data');
      place = p;
      weather = data;
      writeStorage(PLACE_KEY, JSON.stringify(p));
      setStatus('');
      render();
    }).catch(function (error) {
      if (error.name === 'AbortError') return;
      setStatus(networkMessage(), true);
    });
  }

  /* ---------- Draw the page ---------- */
  function render() {
    if (!weather || !place) return;
    var current = weather.current;
    var info = describe(current.weather_code);
    var isDay = current.is_day === 1;

    // Sky colour
    var sky = info[0] === 'clear' || info[0] === 'partly'
      ? (isDay ? 'clear-day' : 'clear-night')
      : info[0];
    document.body.setAttribute('data-sky', sky);
    document.body.setAttribute('data-night', String(!isDay));

    // Current
    $('place-name').textContent = place.name;
    $('place-region').textContent = place.region;
    $('place-time').textContent = localTimeText(current.time);
    $('now-icon').innerHTML = icon(info[0], isDay);
    $('now-temp').textContent = temp(current.temperature_2m);
    $('now-label').textContent = info[1];
    $('stat-feels').textContent = temp(current.apparent_temperature);
    $('stat-humidity').textContent = Math.round(current.relative_humidity_2m) + '%';
    $('stat-wind').textContent = windSpeed(current.wind_speed_10m);

    var rain = weather.daily.precipitation_probability_max[0];
    $('stat-rain').textContent = rain === null || rain === undefined ? 'Not available' : Math.round(rain) + '%';

    // 5-day forecast
    daysEl.innerHTML = '';
    weather.daily.time.forEach(function (date, i) {
      var dayInfo = describe(weather.daily.weather_code[i]);

      var li = document.createElement('li');
      li.className = 'day';

      var name = document.createElement('span');
      name.className = 'day__name';
      name.textContent = dayName(date, i);

      var iconBox = document.createElement('span');
      iconBox.className = 'day__icon';
      iconBox.setAttribute('aria-hidden', 'true');
      iconBox.innerHTML = icon(dayInfo[0], true);

      var label = document.createElement('span');
      label.className = 'day__label';
      label.textContent = dayInfo[1];

      var temps = document.createElement('span');
      temps.className = 'day__temps';
      temps.textContent = temp(weather.daily.temperature_2m_max[i]) + ' ';
      var low = document.createElement('span');
      low.className = 'day__low';
      low.textContent = temp(weather.daily.temperature_2m_min[i]);
      temps.appendChild(low);

      li.appendChild(name);
      li.appendChild(iconBox);
      li.appendChild(label);
      li.appendChild(temps);
      daysEl.appendChild(li);
    });

    nowEl.hidden = false;
    forecastEl.hidden = false;
  }

  function renderUnitButtons() {
    unitBtns.forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.getAttribute('data-unit') === unit));
    });
  }

  /* ---------- Events ---------- */
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var query = cityInput.value.trim();
    if (!query) {
      cityInput.setCustomValidity('Type a city name first.');
      cityInput.reportValidity();
      return;
    }
    searchCity(query);
  });

  cityInput.addEventListener('input', function () { cityInput.setCustomValidity(''); });

  matchesEl.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-index]');
    if (!button) return;
    var chosen = matches[+button.getAttribute('data-index')];
    if (chosen) loadWeather(chosen);
  });

  unitBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      unit = btn.getAttribute('data-unit');
      writeStorage(UNIT_KEY, unit);
      renderUnitButtons();
      render();
    });
  });

  locateBtn.addEventListener('click', function () {
    if (!navigator.geolocation) {
      setStatus("Your browser can't share your location. Search for a city instead.", true);
      return;
    }
    hideMatches();
    setStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(function (position) {
      loadWeather({
        name: 'Your location',
        region: '',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    }, function (error) {
      setStatus(error.code === 1
        ? 'Location access is blocked. Allow it in your browser, or search for a city instead.'
        : "Couldn't find your location. Search for a city instead.", true);
    }, { timeout: 10000, maximumAge: 300000 });
  });

  /* ---------- Start ---------- */
  renderUnitButtons();

  var saved = null;
  try { saved = JSON.parse(readStorage(PLACE_KEY)); } catch (e) { saved = null; }
  if (saved && typeof saved.latitude === 'number' && typeof saved.longitude === 'number') {
    loadWeather(saved);
  }
})();
