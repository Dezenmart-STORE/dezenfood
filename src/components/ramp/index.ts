// ─── DezenMart Ramp System ─────────────────────────────────────────────────
// Drop <RampProvider> at your app root, then use anywhere:
//   - <FloatingRampButton />  - the FAB
//   - <RampModal />           - smart router (widget OR api depending on integrationMode)
//   - useRamp()               - hook to open from any component

export { RampProvider, useRamp } from "./RampContext";
export type { RampMode, RampIntegrationMode, CustomerInfo, WidgetConfig, RampContextType } from "./RampContext";

export { RampModal } from "./RampModal";           // ← use this one always
export { RampWidgetModal } from "./RampWidgetModal"; // direct access if needed
export { RampApiModal } from "./RampApiModal";       // direct access if needed

export { FloatingRampButton } from "./FloatingRampButton";
export type { FloatingRampButtonProps } from "./FloatingRampButton";

export * from "./rampService";
