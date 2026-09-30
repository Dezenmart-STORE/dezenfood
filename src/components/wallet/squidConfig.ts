/**
 * Squid hosted-widget config, mirroring the shape Squid Studio emits for its
 * iframe embed. Two fields were missing from the first attempt and broke it:
 *  - apiUrl:  without it the widget can't reach Squid and reports "Squid Offline".
 *  - theme:   themeType alone doesn't restyle it, so it rendered in light mode.
 *
 * Palette below is Squid's dark theme with DezenMart red (#dc2626) swapped in
 * for every primary/accent slot, so the embed reads as DezenMart.
 */
const RED = "#dc2626";
const OFF_WHITE = "#FBFBFD";

export const SQUID_API_URL = "https://v2.api.squidrouter.com";

const THEME = {
  borderRadius: {
    "button-lg-primary": "3.75rem",
    "button-lg-secondary": "3.75rem",
    "button-lg-tertiary": "3.75rem",
    "button-md-primary": "1.25rem",
    "button-md-secondary": "1.25rem",
    "button-md-tertiary": "1.25rem",
    "button-sm-primary": "1.25rem",
    "button-sm-secondary": "1.25rem",
    "button-sm-tertiary": "1.25rem",
    container: "1.875rem",
    input: "9999px",
    "menu-sm": "0.9375rem",
    "menu-lg": "1.25rem",
    modal: "1.875rem",
  },
  fontSize: {
    caption: "0.875rem",
    "body-small": "1.14375rem",
    "body-medium": "1.40625rem",
    "body-large": "1.75625rem",
    "heading-small": "2.1875rem",
    "heading-medium": "3.08125rem",
    "heading-large": "4.40625rem",
  },
  fontWeight: {
    caption: "400",
    "body-small": "400",
    "body-medium": "400",
    "body-large": "400",
    "heading-small": "400",
    "heading-medium": "400",
    "heading-large": "400",
  },
  fontFamily: { "squid-main": "GeistVariable, sans-serif" },
  boxShadow: {
    container:
      "0px 2px 4px 0px rgba(0, 0, 0, 0.20), 0px 5px 50px -1px rgba(0, 0, 0, 0.33)",
  },
  color: {
    "grey-100": OFF_WHITE,
    "grey-200": "#EDEFF3",
    "grey-300": "#D1D6E0",
    "grey-400": "#A7ABBE",
    "grey-500": "#8A8FA8",
    "grey-600": "#676B7E",
    "grey-700": "#4C515D",
    "grey-800": "#292C32",
    "grey-900": "#17191C",
    // Accent ramp, recoloured from Squid's purple to DezenMart red.
    "royal-300": "#fca5a5",
    "royal-400": "#f87171",
    "royal-500": RED,
    "royal-600": "#b91c1c",
    "royal-700": "#991b1b",
    "status-positive": "#7AE870",
    "status-negative": "#FF4D5B",
    "status-partial": "#F3AF25",
    "highlight-700": "#E4FE53",
    "animation-bg": RED,
    "animation-text": OFF_WHITE,
    "button-lg-primary-bg": RED,
    "button-lg-primary-text": OFF_WHITE,
    "button-lg-secondary-bg": OFF_WHITE,
    "button-lg-secondary-text": "#292C32",
    "button-lg-tertiary-bg": "#292C32",
    "button-lg-tertiary-text": "#D1D6E0",
    "button-md-primary-bg": RED,
    "button-md-primary-text": OFF_WHITE,
    "button-md-secondary-bg": OFF_WHITE,
    "button-md-secondary-text": "#292C32",
    "button-md-tertiary-bg": "#292C32",
    "button-md-tertiary-text": "#D1D6E0",
    // Studio left this purple; red keeps small buttons on-brand too.
    "button-sm-primary-bg": RED,
    "button-sm-primary-text": OFF_WHITE,
    "button-sm-secondary-bg": OFF_WHITE,
    "button-sm-secondary-text": "#292C32",
    "button-sm-tertiary-bg": "#292C32",
    "button-sm-tertiary-text": "#D1D6E0",
    "input-bg": "#17191C",
    "input-placeholder": "#676B7E",
    "input-text": "#D1D6E0",
    "input-selection": "#D1D6E0",
    "menu-bg": "#17191CA8",
    "menu-text": "#FBFBFDA8",
    "menu-backdrop": "#FBFBFD1A",
    "modal-backdrop": "#17191C54",
  },
};

/** Build the hosted-widget URL for a swap or a bridge-to-Celo. */
export function buildSquidIframeUrl(integratorId: string, variant: "swap" | "bridge"): string {
  const config = {
    integratorId,
    theme: THEME,
    themeType: "dark",
    apiUrl: SQUID_API_URL,
    // Swap is the default action from the wallet menu; bridging in also ends on
    // Celo. "send" is hidden - transfers belong in the wallet, not here.
    tabs: {
      swap: true,
      buy: true,
      send: false,
      defaultTab: variant === "swap" ? "swap" : "buy",
    },
    priceImpactWarnings: { warning: 3, critical: 5 },
    loadPreviousStateFromLocalStorage: true,
    // NOTE: deliberately NOT setting availableChains. Locking the destination to
    // Celo is only safe if Celo is enabled for the integrator; otherwise the
    // widget initialises with no usable routes. The known-good Studio config
    // omits it, so we match that. Celo is still enforced where it matters: we
    // switch the wallet to Celo on connect and guard the wrong network at
    // payment time.
  };
  return `https://studio.squidrouter.com/iframe?config=${encodeURIComponent(
    JSON.stringify(config)
  )}`;
}
