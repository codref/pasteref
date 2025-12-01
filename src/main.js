import { defineCustomElement } from 'vue'
import Buefy from 'buefy'
import PasterefComponent from './Pasteref.ce.vue'

// For custom elements, we need to pass plugins via the component config
const Pasteref = defineCustomElement(PasterefComponent, {
  plugins: [Buefy]
})

customElements.define('pasteref-element', Pasteref)

export { Pasteref }
