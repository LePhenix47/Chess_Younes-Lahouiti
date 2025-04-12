import {
  jsClasses,
  cssReset,
  lightThemeVariables,
  darkThemeVariables,
} from "../utils/variables/web-component.variables";

const templateElement = document.createElement("template");

const templateStyle = /* css */ `
 user-component{
  isolation: isolate;
  /* Other CSS styles here */
 }
`;
const templateContent = /*html */ `
 <figure>
  <slot name="title" />
  <slot name="image" />
 </figure>
`;

templateElement.innerHTML = /*html */ `
  <style>
    ${jsClasses}
    ${cssReset}
    ${lightThemeVariables}
    ${darkThemeVariables}

    /* Actual CSS style for the web component*/
    ${templateStyle}
  </style>
  
  ${templateContent}
`;

class WebComponent extends HTMLElement {
  constructor() {
    super();
    //We create the cotnainer that holds the web component
    const shadowRoot = this.attachShadow({ mode: "open" });

    //We clone the template
    const clonedTemplate = templateElement.content.cloneNode(true);
    //We add it as a child of our web component
    shadowRoot.appendChild(clonedTemplate);
  }

  static get observedAttributes() {
    //We indicate the list of attributes that the custom element wants to observe for changes.
    return [];
  }

  connectedCallback() {}

  disconnectedCallback() {}

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "": {
        //…
        break;
      }
      default:
        break;
    }
  }
}

customElements.define("web-component", WebComponent);
