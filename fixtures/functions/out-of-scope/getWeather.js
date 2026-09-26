async function getWeather(city) {
  const res = await fetch("/api/weather?city=" + encodeURIComponent(city));
  const data = await res.json();
  return data.temperature;
}
