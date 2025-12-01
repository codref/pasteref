# pasteref Web Component

A Vue 3 Web Component built with Vite for creating pasteref (a secure paste-style component).

## Project Setup

```sh
npm install
```

### Development

Run the development server with HMR:

```sh
npm run dev
```

### Build

Build the web component for production:

```sh
npm run build
```

This will create:
- `dist/pasteref.es.js` - ES module format
- `dist/pasteref.umd.js` - UMD format (browser compatible)

### Usage

After building, you can use the web component in any HTML page:

```html
<!-- Include the built component -->
<script type="module" src="./dist/pasteref.es.js"></script>

<!-- Use the web component -->
<pasteref-element></pasteref-element>
```

Or import it in a JavaScript module:

```javascript
import { Pasteref } from './dist/pasteref.es.js'
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
