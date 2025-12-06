import { defineCustomElement } from 'vue'
import { createPinia } from 'pinia'
import Buefy from 'buefy'
import PasterefComponent from './Pasteref.ce.vue'

// Create and configure Pinia
const pinia = createPinia()

// For custom elements, we need to manually set the active Pinia
// since the plugins array might not work as expected for Pinia
import { setActivePinia } from 'pinia'
setActivePinia(pinia)

// For custom elements, we need to pass plugins via the component config
const Pasteref = defineCustomElement(PasterefComponent, {
  plugins: [Buefy]
})

customElements.define('pasteref-element', Pasteref)

export { Pasteref }
