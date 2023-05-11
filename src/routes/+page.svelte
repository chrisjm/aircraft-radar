<script>
	import * as RtlSdr from 'rtlsdrjs';
	import Demodulator from 'mode-s-demodulator';
	import AircraftStore from 'mode-s-aircraft-store';
	import { sorter } from 'sorters';
	import { MapLibre, Marker, Popup } from 'svelte-maplibre';
	import Icon from 'mdi-svelte';
	import { mdiAirplane } from '@mdi/js';

	let store = new AircraftStore({
		timeout: 120000 // remove airplane from store if we haven't seen it for 2 minutes
	});

	let sdr;
	let readSamples = false;
	let actualSampleRate;
	let actualCenterFrequency;
	let intervalId;
	let radarStore = {};
	let scanTimer;
	let scanTimerId;

	const demodulator = new Demodulator();

	function formatTime(minutes, seconds) {
		const formattedMinutes = minutes.toString().padStart(2, '0');
		const formattedSeconds = seconds.toString().padStart(2, '0');
		return `${formattedMinutes}:${formattedSeconds}`;
	}

	function startTimer() {
		let minutesElapsed = 0;
		let secondsElapsed = 0;
		scanTimerId = setInterval(() => {
			secondsElapsed++;
			if (secondsElapsed === 60) {
				minutesElapsed++;
				secondsElapsed = 0;
			}
			scanTimer = formatTime(minutesElapsed, secondsElapsed);
		}, 1000);
	}

	function endTimer() {
		clearInterval(scanTimerId);
		scanTimerId = null;
	}

	function handleEnd() {
		console.log('Ended scan!');
		readSamples = false;
		clearInterval(intervalId);
		endTimer();
		intervalId = null;
	}

	function updateRadarStore() {
		// Update radarStore after collecting data
		store.getAircrafts().forEach(function (aircraft) {
			radarStore[aircraft.icao] = aircraft;
		});
	}

	async function handleStart() {
		console.log('Start!');
		//
		// open the device
		//
		// supported options are:
		// - ppm: frequency correction factor, in parts per million (defaults to 0)
		// - gain: optional gain in dB, auto gain is used if not specified
		//
		await sdr.open({
			ppm: 0.5
		});

		//
		// set sample rate and center frequency in Hz
		// - returns the actual values set
		//
		actualSampleRate = await sdr.setSampleRate(2000000);
		actualCenterFrequency = await sdr.setCenterFrequency(1090000000);

		//
		// reset the buffer
		//
		await sdr.resetBuffer();

		readSamples = true;

		// Create timer to run the radarStore update
		intervalId = setInterval(updateRadarStore, 500);
		startTimer();

		while (readSamples) {
			//
			// read some samples
			// - returns an ArrayBuffer with the specified number of samples,
			//   data is interleaved in IQ format
			//
			// const samples = await sdr.readSamples(16 * 16384);
			const samples = await sdr.readSamples(16 * 16384);
			// console.log(samples);
			const data = new Uint8Array(samples);
			// console.log(data);
			// const message = decoder.parse(data);

			demodulator.process(data, data.length, function (message) {
				// got new Mode S message from an airplane
				store.addMessage(message);
			});

			// console.log(message);
		}
	}

	async function handleClick() {
		//
		// request a device
		// - displays prompt in browser
		// - selects first device in Node.js
		//
		// RtlSdr.getDevices() can be used to get a list of all RTL SDR's attached to system
		//
		sdr = await RtlSdr.requestDevice();
	}
</script>

<div class="flex w-full">
	<div class="flex-grow max-w-xs flex flex-col gap-4 overflow-y-auto h-screen">
		<div class="ml-4 mt-3 text-3xl">🛩️🚁📡 Aircraft Radar</div>
		<div class="ml-4 text-xs">
			<div>
				Built by: Chris J Mears (<a
					href="https://github.com/chrisjm"
					class="underline"
					target="_blank">chrisjm</a
				>)
				<a href="https://github.com/chrisjm/aircraft-radar" target="_blank" class="underline"
					>contribute</a
				>
			</div>
			<div>
				<span>Credits:</span>
				<a
					class="underline"
					target="_blank"
					href="https://charliegerard.dev/blog/aircraft-radar-system-rtl-sdr-web-usb/"
					>Charlie Gerard</a
				>,
				<a class="underline" target="_blank" href="https://github.com/sandeepmistry/rtlsdrjs"
					>rtlsdr.js</a
				>,
				<a class="underline" target="_blank" href="https://github.com/watson/mode-s-demodulator"
					>mode-s-demodulator</a
				>,
				<a class="underline" target="_blank" href="https://github.com/dimfeld/svelte-maplibre"
					>svelte-maplibre</a
				>
				<a class="underline" target="_blank" href="https://tailwindcss.com/">tailwindcss</a>
				<a class="underline" target="_blank" href="https://daisyui.com/">daisyUI</a>
			</div>
		</div>

		<div class="ml-4 text-center">
			{#if sdr}
				{#if readSamples}
					<button class="btn btn-sm btn-error" on:click={handleEnd}>End Scanning</button>
					<div class="text-base-300 text-sm">{scanTimer ?? '00:00'}</div>
				{:else}
					<button class="btn btn-primary" on:click={handleStart}>Start Scanning</button>
				{/if}
			{:else}
				<button class="btn" on:click={handleClick}>Register USB Antenna</button>
			{/if}
		</div>

		{#each Object.values(radarStore).sort(sorter({ value: 'count', descending: true })) as aircraft}
			<div class="card card-compact card-bordered ml-4 shadow-md">
				<div class="card-body">
					<h3 class="text-3xl mt-1">
						{#if aircraft.callsign}
							<a
								class="text-primary underline"
								href="https://flightaware.com/live/flight/{aircraft.callsign}"
								target="_blank">{aircraft.callsign}</a
							>
							<span class="text-xs text-base-300">(ICAO {aircraft.icao})</span>
						{:else}<span class="text-base-300">ICAO {aircraft.icao}</span>{/if}
					</h3>
					<div class="text-xs text-base-300">
						Last seen: {new Date(aircraft.seen).toLocaleString()} ({aircraft.count})
					</div>
					<div class="mt-2">
						<div class:text-base-200={aircraft.altitude === 0}>
							Altitude: {aircraft.altitude} ft
						</div>
						<div class:text-base-200={aircraft.altitude === 0}>
							Heading: {aircraft.heading.toFixed(0)}°
						</div>
						<div class:text-base-200={aircraft.altitude === 0}>
							Speed: {aircraft.speed.toFixed(0)} knots
						</div>
						<div class:text-base-200={aircraft.lat === 0 || aircraft.lng === 0}>
							Lng/Lat: {aircraft.lng.toFixed(4)} / {aircraft.lat.toFixed(4)}
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
	<div class="divider divider-horizontal" />
	<div class="flex-grow h-full">
		<MapLibre
			style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
			class="relative w-full aspect-[9/16] h-screen"
			standardControls
			zoom={11}
			center={[-117.1395556, 32.8157222]}
		>
			{#each Object.values(radarStore).filter((a) => a.lat && a.lng) as { callsign, speed, lat, lng, heading, altitude, icao } (icao)}
				<Marker
					lngLat={[lng, lat]}
					class="border-gray-200 border shadow-2xl focus:outline-2 focus:outline-black w-8 h-8 bg-red-300 text-black rounded-full grid place-items-center"
				>
					<Icon path={mdiAirplane} color="black" rotate={heading - 45} />

					<Popup openOn="hover" offset={[0, -10]}>
						<div>
							<span class="font-bold">ID:</span>
							{#if callsign}<a href="https://flightaware.com/live/flight/{callsign}" target="_blank"
									>{callsign}</a
								>{:else}???{/if}({icao})
						</div>
						<div><span class="font-bold">Alt:</span> {altitude ?? '?'} ft</div>
						<div><span class="font-bold">Spd:</span> {speed.toFixed(0) ?? '?'} knots</div>
						<div><span class="font-bold">Hdg:</span> {heading.toFixed(2)}°</div>
						<div><span class="font-bold">Lng:</span> {lng.toFixed(6)}</div>
						<div><span class="font-bold">Lat:</span> {lat.toFixed(6)}</div>
					</Popup>
				</Marker>
			{/each}
		</MapLibre>
	</div>
</div>
