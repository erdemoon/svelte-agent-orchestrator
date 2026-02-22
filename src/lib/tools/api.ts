import type { Tool } from '$lib/types';

export const weatherTool: Tool = {
	name: 'get_weather',
	description: 'Get current weather for a city',
	parameters: {
		type: 'object',
		properties: {
			city: {
				type: 'string',
				description: 'City name to get weather for'
			}
		},
		required: ['city']
	},
	execute: async (params: { city: string }) => {
		try {
			const geoResponse = await fetch(
				`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(params.city)}&count=1&language=en&format=json`
			);
			const geoData = await geoResponse.json();

			if (!geoData.results || geoData.results.length === 0) {
				return { success: false, error: 'City not found' };
			}

			const { latitude, longitude, name, country } = geoData.results[0];

			const weatherResponse = await fetch(
				`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius&wind_speed_unit=kmh`
			);
			const weatherData = await weatherResponse.json();

			const current = weatherData.current;

			const weatherCodes: Record<number, string> = {
				0: 'Clear sky',
				1: 'Mainly clear',
				2: 'Partly cloudy',
				3: 'Overcast',
				45: 'Foggy',
				48: 'Foggy',
				51: 'Light drizzle',
				61: 'Light rain',
				63: 'Moderate rain',
				65: 'Heavy rain',
				71: 'Light snow',
				73: 'Moderate snow',
				75: 'Heavy snow',
				80: 'Rain showers',
				95: 'Thunderstorm'
			};

			return {
				success: true,
				weather: {
					city: `${name}, ${country}`,
					temperature: current.temperature_2m,
					condition: weatherCodes[current.weather_code] || 'Unknown',
					humidity: current.relative_humidity_2m,
					windSpeed: current.wind_speed_10m
				}
			};
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}
};

export const httpGetTool: Tool = {
	name: 'http_get',
	description: 'Make an HTTP GET request to a URL',
	parameters: {
		type: 'object',
		properties: {
			url: {
				type: 'string',
				description: 'URL to fetch'
			}
		},
		required: ['url']
	},
	execute: async (params: { url: string }) => {
		try {
			const response = await fetch(params.url);
			const text = await response.text();

			return {
				success: true,
				status: response.status,
				data: text.substring(0, 1000)
			};
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	}
};
