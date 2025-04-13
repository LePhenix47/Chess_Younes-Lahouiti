export function selectQuery(query: string, container?: any): HTMLElement {
  const hasNoParentContainer: boolean = !container;
  if (hasNoParentContainer) {
    return document.querySelector(query);
  }
  /**
   * We check if it's a web component, they always have a hyphen in their tag name
   */
  const containerIsWebComponent: boolean = container?.tagName?.includes("-");

  if (containerIsWebComponent) {
    return container.shadowRoot.querySelector(query);
  }

  return container.querySelector(query);
}

/**
 * A simplified version of `document.querySelectorAll()`
 *
 * @param {string} query - CSS query of the HTML Elements to select
 * @param {any} container - HTML Element to select the query from
 * @returns {HTMLElement[] | []} - An array with all the elements selected or `null` if the element doesn't exist
 */
export function selectQueryAll(
  query: string,
  container?: any
): HTMLElement[] | [] {
  const hasNoParentContainer: boolean = !container;
  if (hasNoParentContainer) {
    return Array.from(document.querySelectorAll(query));
  }

  const isWebComponent: boolean = container.tagName.includes("-");

  if (isWebComponent) {
    return Array.from(container.shadowRoot.querySelectorAll(query));
  }

  return Array.from(container.querySelectorAll(query));
}

/**
 * Retrieves the value of a CSS property from a given element
 *
 * @param {HTMLElement} element - Element to retrieve the CSS property from
 * @param {string} property - Property name to retrieve the value from
 * @returns {string} the value of the given CSS property
 */
export function getInnerCssVariables(
  element: HTMLElement,
  property: string
): string {
  const styles = window.getComputedStyle(element);

  return styles.getPropertyValue(property);
}
