/**
 * RampModal - smart router
 *
 * Renders the correct implementation based on the `integrationMode`
 * set on <RampProvider>:
 *
 *   integrationMode="widget"  → RampWidgetModal  (Quidax JS SDK)
 *   integrationMode="api"     → RampApiModal     (direct API calls)
 *
 * Drop this ONCE near your app root, inside <RampProvider>.
 */

import { useRamp } from "./RampContext";
import { RampWidgetModal } from "./RampWidgetModal";
import { RampApiModal } from "./RampApiModal";

export const RampModal = () => {
  const { integrationMode } = useRamp();
  return integrationMode === "widget" ? <RampWidgetModal /> : <RampApiModal />;
};
