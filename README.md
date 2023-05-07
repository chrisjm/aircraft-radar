# 🛩️📡 Aircraft Radar

Visualizing aircraft information and position using ADS-B aircraft radio frequency and data.

<img width="1440" alt="Screenshot 2023-05-06 at 10 49 54 PM" src="https://user-images.githubusercontent.com/96110/236660175-a3d8c157-acca-4e12-ab02-14c5a2ef3942.png">

Note: I'm using [RTL-SDR Blog V3 R860 RTL2832U 1PPM TCXO HF Bias Tee SMA Software Defined Radio with Dipole Antenna Kit](https://www.amazon.com/dp/B0BMKB3L47) (not an affiliation link).

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

## Credit

* [Aircraft Radar System SRD Web USB by Charlie Gerard](https://charliegerard.dev/blog/aircraft-radar-system-rtl-sdr-web-usb/)
* [rtlsdr.js](https://github.com/sandeepmistry/rtlsdrjs)
* [mode-s-demodulator](https://github.com/watson/mode-s-demodulator)
* [svelte-maplibre](https://github.com/dimfeld/svelte-maplibre)
* [tailwindcss](https://tailwindcss.com/)
* [daisyUI](https://daisyui.com/)
