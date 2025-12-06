// Helper function to set attributes on elements
export const setAttributes = (element, attributes) => {
  attributes.forEach(({ name, value }) => {
    element.setAttribute(name, value)
  })
}
