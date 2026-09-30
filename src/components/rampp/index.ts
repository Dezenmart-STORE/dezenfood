// ─── DezenMart Ramp System ─────────────────────────────────────────────────
// Drop <RampProvider> at your app root, then use anywhere:
//   - <FloatingRampButton />  - the FAB
//   - <RampModal />           - the actual modal (render once, near root)
//   - useRamp()               - hook to open from any component

export { RampProvider, useRamp } from "./RampContext";
export type { RampMode, CustomerInfo, RampContextType } from "./RampContext";
export { RampModal } from "./RampModal";
export { FloatingRampButton } from "./FloatingRampButton";
export type { FloatingRampButtonProps } from "./FloatingRampButton";
export * from "./rampService";
