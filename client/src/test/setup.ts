import "@testing-library/jest-dom/vitest";

// jsdom lacks pointer capture, which the Select primitive calls on pointer events.
for (const name of ["setPointerCapture", "releasePointerCapture"] as const) {
    if (!(name in Element.prototype)) Object.defineProperty(Element.prototype, name, { value: () => {}, configurable: true });
}
if (!("hasPointerCapture" in Element.prototype)) Object.defineProperty(Element.prototype, "hasPointerCapture", { value: () => false, configurable: true });
