import { decodeCPR } from './cpr-decoder.js';
import { writable } from 'svelte/store';

export interface ModeSMessage {
	aircraftType?: number;
	altitude?: number;
	ca?: number;
	callsign: string;
	crc: number;
	crcOk: boolean;
	dr: number;
	errorbit: number;
	ewDir: number;
	ewVelocity: number;
	fflag?: number;
	fs?: number;
	heading?: number;
	headingIsValid?: boolean;
	icao: number;
	identity: number;
	mesub: number;
	metype: number;
	msg: number[];
	msgbits: number;
	msgtype: number;
	nsDir?: number;
	nsVelocity?: number;
	phaseCorrected: boolean;
	rawLatitude?: number;
	rawLongitude?: number;
	speed?: number;
	tflag?: number;
	um: number;
	unit?: number;
	vertRate: number;
	vertRateSign: number;
	vertRateSource: number;
}

export interface Aircraft {
	callsign: string;
	icao: number;
	count: number;
	seen: number;
	altitude: number;
	unit: number;
	speed: number;
	heading: number;
	lat: number;
	lng: number;
	_oddCprLat: number;
	_oddCprLng: number;
	_oddCprTime: number;
	_evenCprLat: number;
	_evenCprLng: number;
	_evenCprTime: number;
}

export interface AircraftStore {
	timeout: number;
	seenAircraft: Record<string, Aircraft>;
}

const defaultOptions = {
	timeout: 30_000,
	seenAircraft: {}
};

function createAircraftStore() {
	const { subscribe, set, update } = writable<AircraftStore>(defaultOptions);

	function updateAircraft(msg: any, n: AircraftStore) {
		const aircraft = n.seenAircraft[msg.icao] ?? {
			callsign: '',
			icao: 0,
			count: 0,
			seen: 0,
			altitude: 0,
			unit: 0,
			speed: 0,
			heading: 0,
			lat: 0,
			lng: 0,
			_oddCprLat: 0,
			_oddCprLng: 0,
			_oddCprTime: 0,
			_evenCprLat: 0,
			_evenCprLng: 0,
			_evenCprTime: 0
		};

		aircraft.count++;
		aircraft.seen = Date.now();
		aircraft.icao = msg.icao;

		if (msg.msgtype === 0 || msg.msgtype === 4 || msg.msgtype === 20) {
			aircraft.altitude = msg.altitude;
			aircraft.unit = msg.unit;
		} else if (msg.msgtype === 17) {
			if (msg.metype >= 1 && msg.metype <= 4) {
				aircraft.callsign = msg.callsign;
			} else if (msg.metype >= 9 && msg.metype <= 18) {
				aircraft.altitude = msg.altitude;
				aircraft.unit = msg.unit;
				if (msg.fflag) {
					aircraft._oddCprLat = msg.rawLatitude;
					aircraft._oddCprLng = msg.rawLongitude;
					aircraft._oddCprTime = Date.now();
				} else {
					aircraft._evenCprLat = msg.rawLatitude;
					aircraft._evenCprLng = msg.rawLongitude;
					aircraft._evenCprTime = Date.now();
				}

				// if the two messages are less than 10 seconds apart, compute the position
				if (Math.abs(aircraft._evenCprTime - aircraft._oddCprTime) <= 10000) {
					const { lat, lng } = decodeCPR(aircraft);
					aircraft.lat = lat;
					aircraft.lng = lng;
				}
			} else if (msg.metype === 19) {
				if (msg.mesub === 1 || msg.mesub === 2) {
					aircraft.speed = msg.speed;
					aircraft.heading = msg.heading;
				}
			}
		}

		n.seenAircraft[aircraft.icao] = aircraft;

		return n;
	}

	return {
		subscribe,
		addMessage: (msg: ModeSMessage) => update((n) => updateAircraft(msg, n)),
		reset: set(defaultOptions)
	};
}

function prune(aircraftList: Record<string, Aircraft>, timeout: number) {
	const threshold = Date.now() - timeout;
	Object.keys(aircraftList).forEach((icao) => {
		const aircraft = aircraftList[icao];
		if (aircraft.seen < threshold) {
			delete aircraftList[icao];
		}
	});
	return aircraftList;
}

export const aircraftStore = createAircraftStore();
