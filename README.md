# 🛩️🚁📡 Aircraft Radar

Visualizing aircraft information and position using Web USB and ADS-B aircraft radio frequency and data.

![CleanShot 2023-05-30 at 22 22 54](https://github.com/chrisjm/aircraft-radar/assets/96110/088245e2-7221-440f-b61d-0d7468b60cb6)

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

* [Aircraft Radar System SDR Web USB by Charlie Gerard](https://charliegerard.dev/blog/aircraft-radar-system-rtl-sdr-web-usb/)
* [rtlsdr.js](https://github.com/sandeepmistry/rtlsdrjs)
* [mode-s-demodulator](https://github.com/watson/mode-s-demodulator)
* [svelte-maplibre](https://github.com/dimfeld/svelte-maplibre)
* [tailwindcss](https://tailwindcss.com/)
* [daisyUI](https://daisyui.com/)
