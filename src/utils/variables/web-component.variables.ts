/**
 * CSS reset for web components.
 */
export const cssReset: string = /* css */ `
@import url(https://fonts.googleapis.com/css2?family=Roboto:wght@100;400;500;700&display=swap);

@layer web-component-reset {
  @media(prefers-reduced-motion:reduce) {
      *, :after, :before {
          animation: none !important;
          transition: none !important
      }
  }

  *, :after, :before {
      box-sizing: border-box;
      margin: 0;
      padding: 0
  }
  
  ::-moz-selection {
      -webkit-text-stroke: transparent;
      background-color: var(--selection-bg-color);
      color: var(--selection-color)
  }
  
  ::selection {
      -webkit-text-stroke: transparent;
      background-color: var(--selection-bg-color);
      color: var(--selection-color)
  }
  
  html {
      color-scheme: dark light;
      scroll-behavior: smooth
  }
  
  body {
      background-color: var(--bg-primary);
      color: var(--color-primary);
      min-height: 100vh;
      overflow-x: hidden;
      transition: background-color .65s ease-in-out, color .35s ease-in-out
  }
  
  :is(ul, ol) {
      list-style-type: none
  }
  
  button {
      background-color: transparent;
      border-color: transparent;
      color: inherit;
      font-family: inherit
  }
  
  button:hover {
      cursor: pointer
  }
  
  button:hover:disabled {
      cursor: not-allowed
  }
  
  input {
      border-color: transparent;
      font-family: inherit;
      outline-color: transparent
  }
  
  input:hover {
      cursor: pointer
  }
  
  input:focus {
      border-color: transparent;
      outline: transparent
  }
  
  input:disabled {
      cursor: not-allowed
  }
  
  textarea {
      font-family: inherit
  }
  
  textarea, textarea:focus {
      border-color: transparent
  }
  
  textarea:focus {
      outline: transparent
  }
  
  a {
      color: inherit;
      text-decoration: none
  }
  
  a:visited {
      color: currentColor
  }
  
  label:hover {
      cursor: pointer
  }
  
  fieldset {
      border-color: transparent
  }
  
  legend {
      position: static
  }
  
  dialog {
      inset: 50%;
      margin: 0;
      padding: 0;
      position: fixed;
      translate: -50% -50%;
      z-index: 0
  }
  
  dialog, select {
      border: transparent
  }
  
  select {
      font-family: inherit
  }
  
  select:hover {
      cursor: pointer
  }
  
  option {
      font-family: inherit
  }
  
  :is(p, h1, h2, h3, h4, h5, h6, span):empty {
      display: none !important
  }
  input[type=text]:hover {
    cursor: text;
  }
  input[type=button]:hover {
    cursor: pointer;
  }
  input[type=date]:hover {
    cursor: text;
  }
  input[type=datetime]:hover {
    cursor: text;
  }
  input[type=datetime-local]:hover {
    cursor: text;
  }
  input[type=email]:hover {
    cursor: text;
  }
  input[type=month]:hover {
    cursor: text;
  }
  input[type=week]:hover {
    cursor: text;
  }
  input[type=password]:hover {
    cursor: text;
  }
  input[type=tel]:hover {
    cursor: text;
  }
  input[type=time]:hover {
    cursor: text;
  }
  input[type=url]:hover {
    cursor: text;
  }
  input[type=submit]:hover {
    cursor: pointer;
  }
  input[type=reset]:hover {
    cursor: pointer;
  }
  input[type=image]:hover {
    cursor: pointer;
  }
  input[type=hidden]:hover {
    cursor: pointer;
  }
  input[type=file] {
    --file-selector-display: initial;
    --file-selector-width: 80px;
    --file-selector-height: 21px;
  }
  input[type=file]:hover {
    cursor: pointer;
  }
  input[type=file]::file-selector-button {
    display: var(--file-selector-display);
    height: var(--file-selector-height);
    width: var(--file-selector-width);
  }
  input[type=color] {
    background-color: transparent;
    --color-swatch-display: inline-block;
    --color-swatch-height: 100%;
    --color-swatch-border-width: 1px;
    --color-swatch-border-color: currentColor;
  }
  input[type=color]:hover {
    cursor: pointer;
  }
  input[type=color]::-moz-color-swatch {
    display: var(--color-swatch-display);
    height: var(--color-swatch-height);
    border: var(--color-swatch-border-width) solid var(--color-swatch-border-color);
  }
  input[type=color]::-webkit-color-swatch {
    display: var(--color-swatch-display);
    height: var(--color-swatch-height);
    border: var(--color-swatch-border-width) solid var(--color-swatch-border-color);
  }
  input[type=search] {
    --cancel-button-display: initial;
    --results-button-display: initial;
  }
  input[type=search]:hover {
    cursor: text;
  }
  input[type=search]::-webkit-search-cancel-button {
    display: var(--cancel-button-display);
  }
  input[type=search]::-webkit-search-results-button {
    display: var(--results-button-display);
  }
  input[type=number] {
    --inner-spin-appearance: auto;
    --outer-spin-appearance: auto;
    --moz-appearance: initial;
    /*
        Ignore the warning, this is to reset the input on Firefox
        */
    -moz-appearance: var(--moz-appearance);
  }
  input[type=number]:hover {
    cursor: text;
  }
  input[type=number]::-webkit-inner-spin-button {
    appearance: var(--inner-spin-appearance);
  }
  input[type=number]::-webkit-outer-spin-button {
    appearance: var(--outer-spin-appearance);
  }
  input[type=range] {
    border-radius: var(--thumb-border-radius);
    --track-width: 160px;
    --track-height: 20px;
    --track-bg: #e9e9ed;
    --track-appearance: none;
    background-color: var(--track-bg);
    appearance: var(--track-appearance);
    overflow: hidden;
    --thumb-appearance: none;
    --thumb-bg: #484851;
    --thumb-border-color: white;
    --thumb-border-width: 0px;
    --thumb-border-radius: 100vmax;
    --thumb-width: 15px;
    --thumb-height: 15px;
    --inner-track-size: calc(var(--track-width));
    --inner-track-offset: calc(
      -1 * var(--track-width) - var(--thumb-width) / 2
    );
    --inner-track-bg: #2374ff;
  }
  input[type=range]:hover {
    cursor: grab;
  }
  input[type=range]:active {
    cursor: grabbing;
  }
  input[type=range]::-webkit-slider-runnable-track {
    background-color: var(--track-bg);
    width: var(--track-width);
    height: var(--track-bg);
  }
  input[type=range]::-moz-range-track {
    background-color: var(--track-bg);
    width: var(--track-width);
    height: var(--track-bg);
  }
  input[type=range]::-webkit-slider-thumb {
    appearance: var(--thumb-appearance);
    -webkit-appearance: var(--thumb-appearance);
    background-color: var(--thumb-bg);
    color: var(--thumb-bg);
    border: var(--thumb-border-width) solid var(--thumb-border-color);
    border-radius: var(--thumb-border-radius);
    width: var(--thumb-width);
    height: var(--thumb-height);
    box-shadow: var(--inner-track-offset) 0 0 var(--inner-track-size) var(--inner-track-bg);
  }
  input[type=range]::-moz-range-thumb {
    appearance: var(--thumb-appearance) !important;
    background-color: var(--thumb-bg);
    border: var(--thumb-border-width) solid var(--thumb-border-color);
    border-radius: var(--thumb-border-radius);
    width: var(--thumb-width);
    height: var(--thumb-height);
    box-shadow: var(--inner-track-offset) 0 0 var(--inner-track-size) var(--inner-track-bg);
  }
}
`;

/**
 * JS Classes
 */
export const jsClasses: string = /* css */ `
/* 
    Hides the element and all its descendants from view
 */
.hide {
    display: none !important;
}

/* 
    Hides the element from view except for screen readers 
    
    - Good for accessibilty and by consequence SEO
*/
.screen-readers-only {
    /*    
    Positions the element off the screen 
    */ 
    clip: rect(0 0 0 0);
    clip-path: inset(50%);

    /*    
    Sets the dimensions of the element to 1×1 px 
    */ 
    height: 1px;
    width: 1px;

    /*    
    Hides any content that overflows the element 
    */ 
    overflow: hidden;

    /*    
    Positions the element absolutely 
    */ 
    position: absolute;

    /*    
    Prevents line breaks in the element 
    */ 
    white-space: nowrap;
}

/* 
    Disables pointer (click on desktop and tap on mobile) events for the element and its descendants 
*/
.no-pointer-events {
    pointer-events: none;
}

`;

/**
 * CSS variables for web components.
 */
export const lightThemeVariables: string = /* css */ `
:host {
    --bg-primary: rgb(255, 255, 255);
    --bg-secondary: #f0efef;
    --bg-tertiary: #676767;

    --semi-transparent-bg: rgba(255, 255, 255, 50%);

    --color-primary: black;
    --color-secondary: gray;

    --scrollbar-track-bg-color: white;

    --disabled-button-bg: #afafaf;

    --scrollbar-thumb-bg-color: #545454;
    --scrollbar-thumb-bg-color--hover: #757575;
    --scrollbar-thumb-bg-color--active: #b0b0b0;

    --selection-bg-color: hwb(240 0% 0%);
    --selection-color: white;
}

::backdrop {
    --backdrop-bg-color: rgba(255, 255, 255, 0.5);

    --scrollbar-track-bg-color: white;

    --scrollbar-thumb-bg-color: #545454;
    --scrollbar-thumb-bg-color--hover: #757575;
    --scrollbar-thumb-bg-color--active: #b0b0b0;
}
`;

/**
 * Dark theme CSS variables for web components.
 */
export const darkThemeVariables: string = /* css */ `
@media (prefers-color-scheme: dark) {
    :host {
        --bg-primary: black;
        --bg-secondary: #232323;
        --bg-tertiary: #7a7a7a;

        --color-primary: white;

        --semi-transparent-bg: rgba(0, 0, 0, 50%);

        --scrollbar-track-bg-color: black;
        --scrollbar-thumb-bg-color: #ababab;
        --scrollbar-thumb-bg-color--hover: #8a8a8a;
        --scrollbar-thumb-bg-color--active: #4f4f4f;

        --selection-bg: #838383;
        --selection-color: white;

        --selection-bg-color: orange;
        --selection-color: black;
    }


    ::backdrop {
        --backdrop-bg-color: rgba(0, 0, 0, 0.5);

        --scrollbar-track-bg-color: black;

        --scrollbar-thumb-bg-color: #ababab;
        --scrollbar-thumb-bg-color--hover: #8a8a8a;
        --scrollbar-thumb-bg-color--active: #4f4f4f;
    }
}
`;
