// Helper type for listener function signature
export type PointerDragEventMap = {
  "custom:pointer-drag-start": {
    adjustedX: number;
    adjustedY: number;
  };
  "custom:pointer-drag-hold": null;
  "custom:pointer-drag-move": Pick<
    PointerEvent,
    "pageX" | "pageY" | "movementX" | "movementY"
  > &
    PointerDragEventMap["custom:pointer-drag-start"];
  "custom:pointer-drag-leave": null;
  "custom:pointer-drag-cancel": null;
  "custom:pointer-drag-end": Pick<
    PointerEvent,
    "pageX" | "pageY" | "movementX" | "movementY"
  >;
  "custom:pointer-drag-click": {
    clickedElement: HTMLElement;
  };
};

// Define a utility type to make all properties mutable
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type LastPointerPositions = Mutable<
  Pick<PointerEvent, "pageX" | "pageY" | "clientX" | "clientY">
> &
  Partial<{
    containerX: number;
    containerY: number;
  }>;

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
    containerX: NaN,
    containerY: NaN,
  };

  private readonly controller = new AbortController();
  private readonly listenersMap = new Map<
    keyof PointerDragEventMap,
    Function
  >();
  private animationFrameId: number = NaN;
  private container: HTMLElement;

  private pointerDownTime: number = NaN;
  private readonly DRAG_TIME_THRESHOLD_MS = 85;

  static computeOffsetFromContainer = (
    pageX: number,
    pageY: number,
    container: HTMLElement
  ): { x: number; y: number } => {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError("Container must be an HTMLElement");
    }

    const containerRect: DOMRect = container.getBoundingClientRect();

    const x = pageX - containerRect.x;
    const y = pageY - containerRect.y;

    return {
      x,
      y,
    };
  };
  dragStartTimeout: NodeJS.Timeout;
  dragStarted: any;

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
    options?: PointerDragEventMap[K]
  ): this => {
    const customEvent = new CustomEvent(eventName, { detail: options });
    this.container.dispatchEvent(customEvent);

    return this;
  };

  public static computeRelativeViewportYOffset = (clientY: number): number => {
    const viewportHeight: number =
      window.visualViewport?.height || window.innerHeight;

    const viewportBrowserNavBarOffset: number =
      window.visualViewport?.offsetTop || 0;

    const relativeToViewport: number =
      (clientY - viewportBrowserNavBarOffset) / viewportHeight;

    return Math.round(100 * relativeToViewport);
  };

  public static normalizeYOffsetFromCenter = (
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

    this.pointerDownTime = performance.now(); // Store the time the pointer is down

    const isPressing =
      (event.pointerType === "mouse" && event.button === 0) ||
      event.pointerType === "touch";
    this.isPressing = isPressing;
    this.pressedElement = event.target! as HTMLElement;

    const selectedElementDomRect =
      this.pressedElement.getBoundingClientRect?.();
    const containerDomRect = this.container.getBoundingClientRect?.();

    this.initXOffset =
      event.pageX + containerDomRect.x - selectedElementDomRect.x;
    this.initYOffset =
      event.pageY + containerDomRect.y - selectedElementDomRect.y;

    const lastRecordedValuesKeys = Object.keys(
      this.lastRecordedPositions
    ).filter(
      (key) => key !== "adjustedX" && key !== "adjustedY"
    ) as (keyof PointerEvent)[];

    const lastRecordedValues = this.getCustomEventDetails(
      event,
      lastRecordedValuesKeys
    );
    this.lastRecordedPositions = {
      ...lastRecordedValues,
      ...this.lastRecordedPositions,
    };

    // Start the drag hold loop immediately to track dragging state
    if (this.listenersMap.has("custom:pointer-drag-hold")) {
      this.startDragHoldLoop(); // Start tracking drag movement
    }
  };

  // TODO: Refactor code as it looks like a mess
  private handlePointerMove = (event: PointerEvent) => {
    if (!this.isPressing) return; // Ignore if no element is pressed

    const pointerMoveTime = performance.now();
    const dragDuration = pointerMoveTime - this.pointerDownTime;

    // Only dispatch drag start once when the threshold is met
    const containerRect = this.container.getBoundingClientRect?.();
    const adjustedX = event.pageX - containerRect.x;
    const adjustedY = event.pageY - containerRect.y;
    if (dragDuration >= this.DRAG_TIME_THRESHOLD_MS && !this.dragStarted) {
      this.lastRecordedPositions.containerX = adjustedX;
      this.lastRecordedPositions.containerY = adjustedY;

      this.dispatchEvent("custom:pointer-drag-start", {
        adjustedX,
        adjustedY,
      });

      this.dragStarted = true; // Ensure drag start is only dispatched once
    }

    // Dispatch drag move event (continuously as long as dragging is happening)
    if (this.dragStarted) {
      this.dispatchEvent("custom:pointer-drag-move", {
        pageX: event.pageX,
        pageY: event.pageY,
        movementX: event.movementX,
        movementY: event.movementY,
        adjustedX,
        adjustedY,
      });
    }
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
      if (!event[key]) {
        continue;
      }

      customEventDetailsObject[key] = event[key];
    }

    return customEventDetailsObject;
  };

  // private handlePointerUp = (event: PointerEvent) => {
  //   this.resetPointerState(event);
  // };

  private handlePointerUp = (event: PointerEvent) => {
    const pointerUpTime = performance.now();
    const dragDuration = pointerUpTime - this.pointerDownTime; // Calculate how long the pointer was down

    clearTimeout(this.dragStartTimeout); // Clear the timeout if the pointer is up

    if (dragDuration < this.DRAG_TIME_THRESHOLD_MS) {
      // Short duration means it's a click, not a drag
      this.dispatchEvent("custom:pointer-drag-click", {
        clickedElement: event.target as HTMLElement,
      });
    } else {
      // Long duration means it's a drag
      const containerRect = this.container.getBoundingClientRect?.();
      const adjustedX = event.pageX - containerRect.x;
      const adjustedY = event.pageY - containerRect.y;

      this.lastRecordedPositions.containerX = adjustedX;
      this.lastRecordedPositions.containerY = adjustedY;

      this.dispatchEvent("custom:pointer-drag-end", {
        pageY: event.pageY,
        pageX: event.pageX,
        movementY: event.movementY,
        movementX: event.movementX,
      });
    }

    // Reset all state after pointer up
    this.resetAllState();
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

    this.resetAllState();
  };

  private resetAllState = () => {
    this.isPressing = false;
    this.pressedElement = null;
    this.cancelAnimationFrame();
    this.animationFrameId = NaN;
    this.dragStarted = false;
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
