// Helper type for listener function signature
export type PointerDragEventMap = {
  "custom:pointer-drag-start": null;
  "custom:pointer-drag-hold": null;
  "custom:pointer-drag-move": Pick<
    PointerEvent,
    "pageX" | "pageY" | "movementX" | "movementY"
  >;
  "custom:pointer-drag-leave": null;
  "custom:pointer-drag-cancel": null;
  "custom:pointer-drag-end": null;
};

export type LastPointerPositions = Pick<
  PointerEvent,
  "pageX" | "pageY" | "clientX" | "clientY"
>;

class UserPointer {
  public isPressing: boolean = false;
  public pressedElement: HTMLElement | null = null;

  public initXOffset: number = NaN;
  public initYOffset: number = NaN;

  public lastRecordedPositions: LastPointerPositions = {
    pageX: NaN,
    pageY: NaN,
    clientX: NaN,
    clientY: NaN,
  };

  private readonly controller = new AbortController();
  private readonly listenersMap = new Map<
    keyof PointerDragEventMap,
    Function
  >();
  private animationFrameId: number = NaN;
  private container: HTMLElement;

  constructor(container?: HTMLElement) {
    const containerIsNotHTMLElement =
      Boolean(container) && !(container instanceof HTMLElement);
    if (containerIsNotHTMLElement) {
      throw new TypeError("Container must be an HTMLElement");
    }

    this.container = container || document.body;

    this.initializeEventListeners();
  }

  private initializeEventListeners = () => {
    const eventsArray = [
      {
        eventName: "pointerup",
        callback: this.handlePointerUp,
      },
      {
        eventName: "pointerdown",
        callback: this.handlePointerDown,
      },
      {
        eventName: "pointermove",
        callback: this.handlePointerMove,
      },
      {
        eventName: "pointercancel",
        callback: this.handlePointerCancel,
      },
      {
        eventName: "pointerleave",
        callback: this.handlePointerLeave,
      },
    ] as const;

    for (const { eventName, callback } of eventsArray) {
      this.container.addEventListener(eventName, callback, {
        signal: this.controller.signal,
      });
    }
  };

  // Add one listener for each event
  public on = <K extends keyof PointerDragEventMap>(
    eventName: K,
    callback: (event: CustomEvent<PointerDragEventMap[K]>) => void,
    signal?: AbortSignal
  ): this => {
    // If there's already a listener, replace it
    this.listenersMap.set(eventName, callback);

    // Register the listener on the container
    this.container.addEventListener(
      eventName,
      (event) => {
        callback(event as CustomEvent<PointerDragEventMap[K]>);
      },
      { signal: signal || this.controller.signal }
    );

    return this;
  };

  // Add a basic off method to remove the event listener
  public off = <K extends keyof PointerDragEventMap>(eventName: K): this => {
    const callback = this.listenersMap.get(eventName);
    if (!callback) {
      console.warn("Event listener not found for", eventName, ", skipping");

      return this;
    }

    this.container.removeEventListener(eventName, callback as EventListener);
    this.listenersMap.delete(eventName);

    return this;
  };

  public destroyAll = (): this => {
    this.controller.abort();

    return this;
  };

  public dispatchEvent = <K extends keyof PointerDragEventMap>(
    eventName: K,
    options?: PointerDragEventMap[K],
    contentContainer: HTMLElement = document.body
  ): this => {
    const customEvent = new CustomEvent(eventName, { detail: options });
    contentContainer.dispatchEvent(customEvent);

    return this;
  };

  public computeRelativeViewportYOffset = (clientY: number): number => {
    const viewportHeight: number =
      window.visualViewport?.height || window.innerHeight;

    const viewportBrowserNavBarOffset: number =
      window.visualViewport?.offsetTop || 0;

    const relativeToViewport: number =
      (clientY - viewportBrowserNavBarOffset) / viewportHeight;

    return Math.round(100 * relativeToViewport);
  };

  public normalizeYOffsetFromCenter = (
    yOffsetRelativeToViewport: number
  ): number => {
    // ? Value between [-100, 100], from the center
    const yOffsetFromScreenCenter: number =
      (yOffsetRelativeToViewport - 50) * 2;

    return yOffsetFromScreenCenter;
  };

  private cancelAnimationFrame = () => {
    cancelAnimationFrame(this.animationFrameId);
  };

  private handlePointerDown = (event: PointerEvent) => {
    event.preventDefault();

    const isHoldingLeftClick =
      event.pointerType === "mouse" && event.button === 0;
    const isTouchingScreen = event.pointerType === "touch";
    this.isPressing = isHoldingLeftClick || isTouchingScreen;
    this.pressedElement = event.target! as HTMLElement;

    const selectedElementDomRect =
      this.pressedElement.getBoundingClientRect?.();

    const containerDomRect = this.container.getBoundingClientRect?.();

    this.initXOffset =
      event.pageX + containerDomRect.x - selectedElementDomRect.x;
    this.initYOffset =
      event.pageY + containerDomRect.y - selectedElementDomRect.y;

    const lastRecordedValues = this.getCustomEventDetails(
      event,
      Object.keys(this.lastRecordedPositions) as (keyof LastPointerPositions)[]
    );
    console.log(lastRecordedValues);

    this.lastRecordedPositions = lastRecordedValues;

    const customEventsToDispatch: readonly (keyof PointerDragEventMap)[] = [
      "custom:pointer-drag-start",
      "custom:pointer-drag-hold",
    ];

    for (const eventName of customEventsToDispatch) {
      this.dispatchEvent(eventName);
    }

    if (this.listenersMap.has("custom:pointer-drag-hold")) {
      this.startDragHoldLoop();
    }
    // Start the animation frame loop for drag hold
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.isPressing) {
      return;
    }

    const lastRecordedValues = this.getCustomEventDetails(
      event,
      Object.keys(this.lastRecordedPositions) as (keyof LastPointerPositions)[]
    );

    this.lastRecordedPositions = lastRecordedValues;

    const wantedProperties: readonly (keyof PointerDragEventMap["custom:pointer-drag-move"])[] =
      ["pageX", "pageY", "movementX", "movementY"];

    const customEventDetailsObject = this.getCustomEventDetails(
      event,
      wantedProperties
    );

    console.debug(customEventDetailsObject);

    this.dispatchEvent("custom:pointer-drag-move", customEventDetailsObject);
  };

  private getCustomEventDetails = <
    TEvent extends PointerEvent,
    TKeys extends readonly (keyof TEvent)[]
  >(
    event: TEvent,
    propertiesForCustomEvent: TKeys
  ): { [K in TKeys[number]]: TEvent[K] } => {
    const customEventDetailsObject = {} as { [K in TKeys[number]]: TEvent[K] };

    for (const key of propertiesForCustomEvent) {
      customEventDetailsObject[key] = event[key];
    }

    return customEventDetailsObject;
  };

  private handlePointerUp = (event: PointerEvent) => {
    this.resetPointerState(event);
  };

  private handlePointerLeave = (event: PointerEvent) => {
    // this.resetPointerState(event);
    this.dispatchEvent("custom:pointer-drag-leave");
  };

  private handlePointerCancel = (event: PointerEvent) => {
    // this.resetPointerState(event);
    this.dispatchEvent("custom:pointer-drag-cancel");
  };

  public resetPointerState = (event: PointerEvent) => {
    event.preventDefault();

    this.isPressing = false;
    this.pressedElement = null;
    this.cancelAnimationFrame();
    this.animationFrameId = NaN;

    this.dispatchEvent("custom:pointer-drag-end");
  };

  // Start the continuous drag hold loop
  private startDragHoldLoop = () => {
    if (this.animationFrameId) {
      console.warn("loop already started", this.animationFrameId);
      return; // Avoid multiple frames running
    }

    const loop = () => {
      if (!this.isPressing) {
        this.cancelAnimationFrame();
        return;
      }

      this.animationFrameId = requestAnimationFrame(loop); // Request next frame
      this.dispatchEvent("custom:pointer-drag-hold"); // Dispatch continuously
    };

    this.animationFrameId = requestAnimationFrame(loop);
  };
}

export default UserPointer;
