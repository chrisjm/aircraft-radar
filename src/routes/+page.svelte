<script lang="ts">
	import * as RtlSdr from 'rtlsdrjs';
	import Demodulator from 'mode-s-demodulator';
	import Icon from 'mdi-svelte';
	import { sorter } from 'sorters';
	import { format } from 'd3-format';
	import { LineLayer, MapLibre, Marker, Popup, GeoJSON } from 'svelte-maplibre';
	import {
		mdiAirplane,
		mdiArrowUpBoldCircle,
		mdiLatitude,
		mdiLongitude,
		mdiTrendingDown,
		mdiTrendingNeutral,
		mdiTrendingUp
	} from '@mdi/js';
	import { aircraftStore, type ModeSMessage } from '../lib/aircraft-store';

	let sdr: any;
	let readSamples = false;
	let actualSampleRate;
	let actualCenterFrequency;
	let scanTimer: string;
	let scanTimerId: number | undefined;
	let sampleCount = 0;
	let samplePerSecond = 0;

	const numberFormat = format(',.2r');
	const demodulator = new Demodulator();

	function formatTime(minutes: number, seconds: number) {
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
			samplePerSecond = sampleCount;
			sampleCount = 0;
		}, 1000);
	}

	function endTimer() {
		clearInterval(scanTimerId);
		scanTimerId = undefined;
	}

	function handleEnd() {
		readSamples = false;
		endTimer();
		console.log('Ended scan!');
	}

	async function handleStart() {
		console.log('Start scan...');
		await sdr.open({ ppm: 0.5 });
		actualSampleRate = await sdr.setSampleRate(2_000_000);
		actualCenterFrequency = await sdr.setCenterFrequency(1090_000_000);
		await sdr.resetBuffer();
		console.log({ actualSampleRate, actualCenterFrequency });

		readSamples = true;
		startTimer();

		while (readSamples) {
			const samples = await sdr.readSamples(16 * 16384);
			const data = new Uint8Array(samples);
			demodulator.process(data, data.length, function (message: ModeSMessage) {
				sampleCount++;
				aircraftStore.addMessage(message);
				aircraftStore.prune();
			});
		}
	}

	async function handleClick() {
		sdr = await RtlSdr.requestDevice();
	}
</script>

<div class="flex w-full">
	<div class="flex-grow max-w-md flex flex-col gap-4 overflow-y-auto h-screen">
		<div class="m-2 flex flex-col">
			<span class="text-3xl">🛩️🚁📡 Aircraft Radar</span>
			<span class="text-xs">
				Built by: Chris J Mears (<a
					href="https://github.com/chrisjm"
					class="underline"
					target="_blank">chrisjm</a
				>)
				<a href="https://github.com/chrisjm/aircraft-radar" target="_blank" class="underline"
					>contribute</a
				>
			</span>
		</div>
		<div class="m-2 text-center">
			{#if sdr}
				{#if readSamples}
					<button class="btn btn-sm btn-error" on:click={handleEnd}>End Scanning</button>
					<div class="text-base-300 text-sm">
						{scanTimer ?? '00:00'} ({Math.floor(samplePerSecond)} samples/sec)
					</div>
				{:else}
					<button class="btn btn-primary" on:click={handleStart}>Start Scanning</button>
				{/if}
			{:else}
				<button class="btn" on:click={handleClick}>Register USB Antenna</button>
			{/if}
		</div>
		<div class="m-2 flex-grow overflow-x-auto">
			{#if Object.values($aircraftStore.seenAircraft ?? {}).length}
				<table class="table table-compact w-full">
					<thead>
						<tr>
							<th>Callsign</th>
							<th>Alt/Spd</th>
							<th>Hdg/Geo</th>
							<th>Last Seen</th>
						</tr>
					</thead>
					<tbody>
						{#each Object.values($aircraftStore?.seenAircraft ?? {}).sort(sorter( { value: 'callsign' } )) as aircraft}
							<tr>
								<th>
									<div class="flex flex-col">
										{#if aircraft.callsign}
											<a
												class="text-primary underline"
												href="https://flightaware.com/live/flight/{aircraft.callsign}"
												target="_blank">{aircraft.callsign}</a
											>
											<span class="text-xs text-base-300 font-normal">(ICAO {aircraft.icao})</span>
										{:else}<span class="text-base-300 font-normal">ICAO {aircraft.icao}</span>{/if}
									</div>
								</th>
								<td>
									<div class="flex flex-col gap-0.5">
										<div class="flex gap-2 items-center">
											<span>{numberFormat(aircraft.altitude)} ft</span>
											{#if aircraft.altitudeTrend > 0}
												<Icon size="0.8rem" path={mdiTrendingUp} />
											{:else if aircraft.altitudeTrend < 0}
												<Icon size="0.8rem" path={mdiTrendingDown} />
											{:else}
												<Icon size="0.8rem" path={mdiTrendingNeutral} />
											{/if}
										</div>
										<div class="flex gap-2 items-center">
											<span>{aircraft.speed.toFixed(0)} knots</span>
											{#if aircraft.speedTrend > 0}
												<Icon size="0.8rem" path={mdiTrendingUp} />
											{:else if aircraft.speedTrend < 0}
												<Icon size="0.8rem" path={mdiTrendingDown} />
											{:else}
												<Icon size="0.8rem" path={mdiTrendingNeutral} />
											{/if}
										</div>
									</div>
								</td>
								<td>
									<div class="flex flex-col gap-1">
										<div class="flex gap-1 items-center">
											<span>{aircraft.heading.toFixed(0)}°</span>
											<span
												><Icon
													path={mdiArrowUpBoldCircle}
													rotate={aircraft.heading}
													size="1rem"
												/></span
											>
										</div>
										<div class="text-base-300 text-xs flex gap-1 items-center">
											<Icon size="0.8rem" path={mdiLongitude} />
											<span>{aircraft.lng.toFixed(4)}</span>
										</div>
										<div class="text-base-300 text-xs flex gap-1 items-center">
											<Icon size="0.8rem" path={mdiLatitude} />
											<span>{aircraft.lat.toFixed(4)}</span>
										</div>
									</div>
								</td>
								<td>
									<div class="flex flex-col gap-1 text-xs">
										<div>{new Date(aircraft.seen).toLocaleTimeString()}</div>
										<div class="text-base-300">{numberFormat(aircraft.count)} samples</div>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<div class="text-center">No aircraft detected.</div>
			{/if}
		</div>
		<div class="m-2 text-xs">
			<div>
				<span>Additional Credits:</span>
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
	</div>
	<div class="flex-grow h-full">
		<MapLibre
			style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
			class="relative w-full aspect-[9/16] h-screen"
			standardControls
			zoom={11}
			center={[-117.1395556, 32.8157222]}
		>
			{#each Object.values($aircraftStore?.seenAircraft ?? {}).filter((a) => a.lat && a.lng) as { callsign, speed, lat, lng, heading, altitude, icao, geoHistory } (icao)}
				{@const data = {
					type: 'Feature',
					properties: {
						name: 'Path'
					},
					geometry: {
						type: 'LineString',
						coordinates: [...geoHistory.map((h) => [h[0], h[1]])]
					}
				}}
				<GeoJSON id="{icao}-path" {data}>
					<LineLayer
						layout={{ 'line-cap': 'round', 'line-join': 'round' }}
						paint={{
							'line-width': 2,
							'line-color': '#008800',
							'line-opacity': 0.8
						}}
					/>
				</GeoJSON>
				<Marker lngLat={[lng, lat]} class="relative">
					<div
						class="p-2 border-blue-200 border focus:outline-2 focus:outline-black text-black rounded-full grid place-items-center bg-blue-50 opacity-80"
					>
						<Icon path={mdiAirplane} color="black" rotate={heading - 45} />
						{#if callsign}
							<div class="absolute -top-4 -right-8 bg-black text-white rounded px-1">
								{callsign}
							</div>
						{/if}
						<Popup openOn="hover" offset={[0, -10]}>
							<div>
								<span class="font-bold">ID:</span>
								{#if callsign}<a
										href="https://flightaware.com/live/flight/{callsign}"
										target="_blank">{callsign}</a
									>{:else}???{/if} ({icao})
							</div>
							<div><span class="font-bold">Alt:</span> {altitude ?? '?'} ft</div>
							<div><span class="font-bold">Spd:</span> {speed.toFixed(0) ?? '?'} knots</div>
							<div><span class="font-bold">Hdg:</span> {heading.toFixed(2)}°</div>
							<div><span class="font-bold">Lng:</span> {lng.toFixed(6)}</div>
							<div><span class="font-bold">Lat:</span> {lat.toFixed(6)}</div>
						</Popup>
					</div>
				</Marker>
			{/each}
		</MapLibre>
	</div>
</div>
