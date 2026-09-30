// import { useEffect, useRef, useState, useCallback } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { useRamp } from "./RampContext";

// // ─── Types from Quidax widget callbacks ──────────────────────────────────
// interface QuidaxWalletDetails {
//   amount: string;
//   network: string;
//   walletAddress: string;
// }

// interface QuidaxTransaction {
//   reference: string;
//   status: string;
//   [key: string]: any;
// }

// declare global {
//   interface Window {
//     ramp?: {
//       initialize: (config: QuidaxRampConfig) => void;
//     };
//   }
// }

// interface QuidaxRampConfig {
//   public_key: string;
//   reference: string;
//   from_currency: string;
//   to_currency: string;
//   from_amount: string;
//   mode: "buy" | "sell";
//   network: string;
//   address?: string;
//   onClose: (ref: string) => void;
//   onReceiveWalletDetails: (details: QuidaxWalletDetails) => void;
//   onSuccess: (transaction: QuidaxTransaction) => void;
// }

// // ─── Icons ───────────────────────────────────────────────────────────────
// const X = () => (
//   <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
//     <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
//   </svg>
// );

// const ArrowUpDown = () => (
//   <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
//     <path d="M4 6L8 2L12 6M12 10L8 14L4 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
//   </svg>
// );

// const CheckCircle = () => (
//   <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
//     <circle cx="24" cy="24" r="22" stroke="#22c55e" strokeWidth="2.5" />
//     <path d="M14 24l8 8 12-14" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
//   </svg>
// );

// // ─── Spinner ─────────────────────────────────────────────────────────────
// const Spinner = ({ size = 20 }: { size?: number }) => (
//   <svg width={size} height={size} viewBox="0 0 20 20" style={{ animation: "qdx-spin 0.8s linear infinite" }}>
//     <circle cx="10" cy="10" r="7" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" fill="none" />
//     <path d="M10 3a7 7 0 0 1 7 7" stroke="#E23B3B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
//     <style>{`@keyframes qdx-spin { to { transform: rotate(360deg); } }`}</style>
//   </svg>
// );

// // ─── Unique reference generator ───────────────────────────────────────────
// const genRef = () =>
//   `DZM-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

// // ─── Script loader ────────────────────────────────────────────────────────
// const RAMP_SCRIPT_URL = "https://d309lcjd52k0i0.cloudfront.net/ramp.js";

// function useQuidaxScript(): "idle" | "loading" | "ready" | "error" {
//   const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
//     () => (window.ramp ? "ready" : "idle")
//   );

//   useEffect(() => {
//     if (window.ramp) { setStatus("ready"); return; }

//     const existing = document.querySelector<HTMLScriptElement>(
//       `script[src="${RAMP_SCRIPT_URL}"]`
//     );

//     if (existing) {
//       // Already injected but maybe still loading
//       const check = setInterval(() => {
//         if (window.ramp) { setStatus("ready"); clearInterval(check); }
//       }, 100);
//       return () => clearInterval(check);
//     }

//     setStatus("loading");
//     const script = document.createElement("script");
//     script.src = RAMP_SCRIPT_URL;
//     script.async = true;
//     script.onload = () => setStatus("ready");
//     script.onerror = () => setStatus("error");
//     document.head.appendChild(script);
//   }, []);

//   return status;
// }

// // ─── Widget Shell Modal ───────────────────────────────────────────────────
// /**
//  * RampWidgetModal
//  *
//  * Wraps the Quidax JS widget inside DezenFoods's own styled shell:
//  *  • Tab switcher (Buy / Sell)
//  *  • Loading + error states
//  *  • Success screen after onSuccess fires
//  *  • onClose syncs back to our provider
//  *
//  * The Quidax widget renders its own UI inside the iframe it mounts;
//  * this shell just controls lifecycle and chrome.
//  */
// export const RampWidgetModal = () => {
//   const { isOpen, mode, setMode, closeRamp, widgetConfig } = useRamp();
//   const scriptStatus = useQuidaxScript();

//   const [widgetState, setWidgetState] = useState<
//     "idle" | "launching" | "active" | "success" | "error"
//   >("idle");
//   const [successTx, setSuccessTx] = useState<QuidaxTransaction | null>(null);
//   const [walletDetails, setWalletDetails] = useState<QuidaxWalletDetails | null>(null);
//   const [errorMsg, setErrorMsg] = useState("");
//   const currentRef = useRef(genRef());

//   // Reset every time modal opens
//   useEffect(() => {
//     if (isOpen) {
//       setWidgetState("idle");
//       setSuccessTx(null);
//       setWalletDetails(null);
//       setErrorMsg("");
//       currentRef.current = genRef();
//     }
//   }, [isOpen]);

//   const launchWidget = useCallback(() => {
//     if (!widgetConfig?.publicKey) {
//       setErrorMsg("No public key configured. Pass widgetConfig.publicKey to <RampProvider>.");
//       setWidgetState("error");
//       return;
//     }
//     if (scriptStatus !== "ready" || !window.ramp) {
//       setErrorMsg("Quidax widget script failed to load. Check your network connection.");
//       setWidgetState("error");
//       return;
//     }

//     setWidgetState("launching");

//     const isBuy = mode === "onramp";

//     const config: QuidaxRampConfig = {
//       public_key: widgetConfig.publicKey,
//       reference: currentRef.current,
//       from_currency: isBuy ? "ngn" : "usdt",
//       to_currency: isBuy ? "usdt" : "ngn",
//       from_amount: widgetConfig.defaultAmount ?? "1",
//       mode: isBuy ? "buy" : "sell",
//       network: widgetConfig.defaultNetwork ?? "BEP20",
//       ...(isBuy && widgetConfig.defaultAddress
//         ? { address: widgetConfig.defaultAddress }
//         : {}),
//       onClose: (ref) => {
//         console.log("[Quidax Ramp] closed", ref);
//         // Widget closed but we keep our shell open so user sees state
//         setWidgetState((s) => (s === "launching" || s === "active" ? "idle" : s));
//       },
//       onReceiveWalletDetails: (details) => {
//         console.log("[Quidax Ramp] wallet details", details);
//         setWalletDetails(details);
//         setWidgetState("active");
//       },
//       onSuccess: (tx) => {
//         console.log("[Quidax Ramp] success", tx);
//         setSuccessTx(tx);
//         setWidgetState("success");
//       },
//     };

//     try {
//       window.ramp.initialize(config);
//       // After a brief delay switch to "active" if wallet details haven't arrived
//       setTimeout(() => {
//         setWidgetState((s) => (s === "launching" ? "active" : s));
//       }, 800);
//     } catch (e: any) {
//       setErrorMsg(e?.message ?? "Failed to launch widget");
//       setWidgetState("error");
//     }
//   }, [mode, scriptStatus, widgetConfig]);

//   // Auto-launch when modal opens and script is ready
//   useEffect(() => {
//     if (isOpen && scriptStatus === "ready" && widgetState === "idle") {
//       launchWidget();
//     }
//   }, [isOpen, scriptStatus, widgetState, launchWidget]);

//   if (!isOpen) return null;

//   return (
//     <AnimatePresence>
//       {isOpen && (
//         <>
//           {/* Backdrop */}
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             onClick={closeRamp}
//             style={{
//               position: "fixed",
//               inset: 0,
//               zIndex: 50,
//               background: "rgba(0,0,0,0.72)",
//               backdropFilter: "blur(4px)",
//             }}
//           />

//           {/* Shell */}
//           <motion.div
//             initial={{ opacity: 0, scale: 0.94, y: 24 }}
//             animate={{ opacity: 1, scale: 1, y: 0 }}
//             exit={{ opacity: 0, scale: 0.94, y: 24 }}
//             transition={{ type: "spring", damping: 22, stiffness: 280 }}
//             style={{
//               position: "fixed",
//               inset: 0,
//               zIndex: 51,
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               padding: "16px",
//               pointerEvents: "none",
//             }}
//           >
//             <div
//               onClick={(e) => e.stopPropagation()}
//               style={{
//                 background: "#1A1C20",
//                 width: "100%",
//                 maxWidth: "440px",
//                 borderRadius: "20px",
//                 boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
//                 pointerEvents: "auto",
//                 overflow: "hidden",
//               }}
//             >
//               {/* Header */}
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                   padding: "16px 20px",
//                   borderBottom: "1px solid #2F3136",
//                 }}
//               >
//                 {/* Tab switcher */}
//                 <div
//                   style={{
//                     display: "flex",
//                     background: "#212428",
//                     padding: "4px",
//                     borderRadius: "10px",
//                     gap: "2px",
//                   }}
//                 >
//                   {(["onramp", "offramp"] as const).map((m) => (
//                     <button
//                       key={m}
//                       onClick={() => {
//                         setMode(m);
//                         setWidgetState("idle");
//                         currentRef.current = genRef();
//                       }}
//                       style={{
//                         padding: "6px 16px",
//                         borderRadius: "7px",
//                         fontSize: "13px",
//                         fontWeight: 600,
//                         border: "none",
//                         cursor: "pointer",
//                         transition: "all 0.18s",
//                         background: mode === m ? "#E23B3B" : "transparent",
//                         color: mode === m ? "#fff" : "#C6C6C8",
//                       }}
//                     >
//                       {m === "onramp" ? "Buy Crypto" : "Sell Crypto"}
//                     </button>
//                   ))}
//                 </div>

//                 <button
//                   onClick={closeRamp}
//                   style={{
//                     background: "none",
//                     border: "none",
//                     color: "#545456",
//                     cursor: "pointer",
//                     padding: "4px",
//                     display: "flex",
//                     alignItems: "center",
//                     transition: "color 0.15s",
//                   }}
//                   onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
//                   onMouseLeave={(e) => (e.currentTarget.style.color = "#545456")}
//                 >
//                   <X />
//                 </button>
//               </div>

//               {/* Body */}
//               <div style={{ padding: "28px 24px" }}>
//                 <AnimatePresence mode="wait">

//                   {/* Script loading */}
//                   {scriptStatus === "loading" && (
//                     <motion.div
//                       key="script-loading"
//                       initial={{ opacity: 0 }}
//                       animate={{ opacity: 1 }}
//                       exit={{ opacity: 0 }}
//                       style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "32px 0" }}
//                     >
//                       <Spinner size={36} />
//                       <p style={{ color: "#C6C6C8", fontSize: "14px", margin: 0 }}>
//                         Loading secure payment widget…
//                       </p>
//                     </motion.div>
//                   )}

//                   {/* Launching */}
//                   {scriptStatus === "ready" && (widgetState === "launching" || widgetState === "idle") && (
//                     <motion.div
//                       key="launching"
//                       initial={{ opacity: 0 }}
//                       animate={{ opacity: 1 }}
//                       exit={{ opacity: 0 }}
//                       style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "32px 0" }}
//                     >
//                       <div
//                         style={{
//                           width: "64px",
//                           height: "64px",
//                           borderRadius: "50%",
//                           background: "rgba(226,59,59,0.1)",
//                           display: "flex",
//                           alignItems: "center",
//                           justifyContent: "center",
//                         }}
//                       >
//                         <ArrowUpDown />
//                       </div>
//                       <div style={{ textAlign: "center" }}>
//                         <p style={{ color: "#fff", fontWeight: 600, margin: "0 0 6px" }}>
//                           {mode === "onramp" ? "Buy Crypto with NGN" : "Sell Crypto for NGN"}
//                         </p>
//                         <p style={{ color: "#C6C6C8", fontSize: "13px", margin: 0 }}>
//                           The Quidax payment window is opening…
//                         </p>
//                       </div>
//                       <button
//                         onClick={launchWidget}
//                         style={{
//                           background: "#E23B3B",
//                           color: "#fff",
//                           border: "none",
//                           borderRadius: "12px",
//                           padding: "12px 32px",
//                           fontSize: "14px",
//                           fontWeight: 600,
//                           cursor: "pointer",
//                           display: "flex",
//                           alignItems: "center",
//                           gap: "8px",
//                           transition: "background 0.15s",
//                         }}
//                         onMouseEnter={(e) => (e.currentTarget.style.background = "#c52f2f")}
//                         onMouseLeave={(e) => (e.currentTarget.style.background = "#E23B3B")}
//                       >
//                         <ArrowUpDown />
//                         {widgetState === "idle" ? "Open Widget" : "Launching…"}
//                       </button>
//                     </motion.div>
//                   )}

//                   {/* Active - widget is open externally, show helper info */}
//                   {widgetState === "active" && (
//                     <motion.div
//                       key="active"
//                       initial={{ opacity: 0 }}
//                       animate={{ opacity: 1 }}
//                       exit={{ opacity: 0 }}
//                       style={{ display: "flex", flexDirection: "column", gap: "16px" }}
//                     >
//                       <div
//                         style={{
//                           background: "rgba(226,59,59,0.08)",
//                           border: "1px solid rgba(226,59,59,0.2)",
//                           borderRadius: "12px",
//                           padding: "14px 16px",
//                           display: "flex",
//                           alignItems: "flex-start",
//                           gap: "10px",
//                         }}
//                       >
//                         <span style={{ fontSize: "18px" }}>💡</span>
//                         <p style={{ color: "#C6C6C8", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>
//                           Complete your {mode === "onramp" ? "purchase" : "sale"} in the Quidax
//                           window that just opened. This window will update once your transaction
//                           is confirmed.
//                         </p>
//                       </div>

//                       {walletDetails && (
//                         <div
//                           style={{
//                             background: "#292B30",
//                             borderRadius: "12px",
//                             padding: "14px 16px",
//                             display: "flex",
//                             flexDirection: "column",
//                             gap: "10px",
//                           }}
//                         >
//                           <p style={{ color: "#C6C6C8", fontSize: "11px", fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
//                             Wallet Details Received
//                           </p>
//                           {walletDetails.walletAddress && (
//                             <WalletRow label="Address" value={walletDetails.walletAddress} />
//                           )}
//                           {walletDetails.network && (
//                             <WalletRow label="Network" value={walletDetails.network} />
//                           )}
//                           {walletDetails.amount && (
//                             <WalletRow label="Amount" value={walletDetails.amount} />
//                           )}
//                         </div>
//                       )}

//                       <div style={{ display: "flex", gap: "8px" }}>
//                         <button
//                           onClick={launchWidget}
//                           style={{
//                             flex: 1,
//                             background: "#292B30",
//                             color: "#C6C6C8",
//                             border: "none",
//                             borderRadius: "12px",
//                             padding: "12px",
//                             fontSize: "13px",
//                             fontWeight: 500,
//                             cursor: "pointer",
//                             transition: "color 0.15s",
//                           }}
//                           onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
//                           onMouseLeave={(e) => (e.currentTarget.style.color = "#C6C6C8")}
//                         >
//                           Reopen Widget
//                         </button>
//                         <button
//                           onClick={closeRamp}
//                           style={{
//                             flex: 1,
//                             background: "transparent",
//                             color: "#545456",
//                             border: "1px solid #2F3136",
//                             borderRadius: "12px",
//                             padding: "12px",
//                             fontSize: "13px",
//                             cursor: "pointer",
//                             transition: "color 0.15s, border-color 0.15s",
//                           }}
//                           onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#545456"; }}
//                           onMouseLeave={(e) => { e.currentTarget.style.color = "#545456"; e.currentTarget.style.borderColor = "#2F3136"; }}
//                         >
//                           Close
//                         </button>
//                       </div>
//                     </motion.div>
//                   )}

//                   {/* Success */}
//                   {widgetState === "success" && (
//                     <motion.div
//                       key="success"
//                       initial={{ opacity: 0, scale: 0.9 }}
//                       animate={{ opacity: 1, scale: 1 }}
//                       exit={{ opacity: 0 }}
//                       style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "16px 0" }}
//                     >
//                       <motion.div
//                         initial={{ scale: 0 }}
//                         animate={{ scale: 1 }}
//                         transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.1 }}
//                       >
//                         <CheckCircle />
//                       </motion.div>

//                       <div style={{ textAlign: "center" }}>
//                         <h3 style={{ color: "#fff", fontWeight: 700, fontSize: "18px", margin: "0 0 6px" }}>
//                           {mode === "onramp" ? "Purchase Successful!" : "Sale Confirmed!"}
//                         </h3>
//                         <p style={{ color: "#C6C6C8", fontSize: "13px", margin: 0 }}>
//                           {mode === "onramp"
//                             ? "Your crypto will arrive in your wallet shortly."
//                             : "Your NGN will be credited to your bank account shortly."}
//                         </p>
//                       </div>

//                       {successTx && (
//                         <div
//                           style={{
//                             width: "100%",
//                             background: "#292B30",
//                             borderRadius: "12px",
//                             padding: "14px 16px",
//                             display: "flex",
//                             flexDirection: "column",
//                             gap: "8px",
//                           }}
//                         >
//                           {successTx.reference && (
//                             <WalletRow label="Reference" value={successTx.reference} copyable />
//                           )}
//                           {successTx.status && (
//                             <WalletRow label="Status" value={successTx.status} />
//                           )}
//                         </div>
//                       )}

//                       <button
//                         onClick={closeRamp}
//                         style={{
//                           width: "100%",
//                           background: "#E23B3B",
//                           color: "#fff",
//                           border: "none",
//                           borderRadius: "12px",
//                           padding: "14px",
//                           fontSize: "14px",
//                           fontWeight: 600,
//                           cursor: "pointer",
//                           transition: "background 0.15s",
//                         }}
//                         onMouseEnter={(e) => (e.currentTarget.style.background = "#c52f2f")}
//                         onMouseLeave={(e) => (e.currentTarget.style.background = "#E23B3B")}
//                       >
//                         Done
//                       </button>
//                     </motion.div>
//                   )}

//                   {/* Error */}
//                   {widgetState === "error" && (
//                     <motion.div
//                       key="error"
//                       initial={{ opacity: 0 }}
//                       animate={{ opacity: 1 }}
//                       exit={{ opacity: 0 }}
//                       style={{ display: "flex", flexDirection: "column", gap: "16px" }}
//                     >
//                       <div
//                         style={{
//                           background: "rgba(239,68,68,0.08)",
//                           border: "1px solid rgba(239,68,68,0.3)",
//                           borderRadius: "12px",
//                           padding: "14px 16px",
//                         }}
//                       >
//                         <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>
//                           ⚠️ {errorMsg || "Something went wrong launching the widget."}
//                         </p>
//                       </div>
//                       <div style={{ display: "flex", gap: "8px" }}>
//                         <button
//                           onClick={() => { setWidgetState("idle"); setErrorMsg(""); }}
//                           style={{
//                             flex: 1,
//                             background: "#E23B3B",
//                             color: "#fff",
//                             border: "none",
//                             borderRadius: "12px",
//                             padding: "12px",
//                             fontSize: "13px",
//                             fontWeight: 600,
//                             cursor: "pointer",
//                           }}
//                         >
//                           Try Again
//                         </button>
//                         <button
//                           onClick={closeRamp}
//                           style={{
//                             flex: 1,
//                             background: "#292B30",
//                             color: "#C6C6C8",
//                             border: "none",
//                             borderRadius: "12px",
//                             padding: "12px",
//                             fontSize: "13px",
//                             cursor: "pointer",
//                           }}
//                         >
//                           Close
//                         </button>
//                       </div>
//                     </motion.div>
//                   )}
//                 </AnimatePresence>
//               </div>

//               {/* Footer */}
//               <div
//                 style={{
//                   padding: "12px 20px",
//                   borderTop: "1px solid #2F3136",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   gap: "6px",
//                 }}
//               >
//                 <LockIcon />
//                 <span style={{ color: "#545456", fontSize: "11px" }}>
//                   Secured by Quidax · Ref: {currentRef.current}
//                 </span>
//               </div>
//             </div>
//           </motion.div>
//         </>
//       )}
//     </AnimatePresence>
//   );
// };

// // ─── Small helpers ────────────────────────────────────────────────────────
// const WalletRow = ({
//   label,
//   value,
//   copyable,
// }: {
//   label: string;
//   value: string;
//   copyable?: boolean;
// }) => {
//   const [copied, setCopied] = useState(false);
//   return (
//     <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//       <span style={{ color: "#C6C6C8", fontSize: "12px" }}>{label}</span>
//       <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//         <span
//           style={{
//             color: "#fff",
//             fontSize: "12px",
//             fontWeight: 500,
//             maxWidth: "200px",
//             overflow: "hidden",
//             textOverflow: "ellipsis",
//             whiteSpace: "nowrap",
//           }}
//         >
//           {value}
//         </span>
//         {copyable && (
//           <button
//             onClick={() => {
//               navigator.clipboard.writeText(value);
//               setCopied(true);
//               setTimeout(() => setCopied(false), 2000);
//             }}
//             style={{
//               background: "none",
//               border: "none",
//               color: copied ? "#22c55e" : "#E23B3B",
//               fontSize: "11px",
//               cursor: "pointer",
//               padding: 0,
//               fontWeight: 500,
//             }}
//           >
//             {copied ? "✓ Copied" : "Copy"}
//           </button>
//         )}
//       </div>
//     </div>
//   );
// };

// const LockIcon = () => (
//   <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
//     <rect x="1" y="4.5" width="9" height="6" rx="1.2" stroke="#545456" strokeWidth="1.1" />
//     <path d="M3.5 4.5V3a2 2 0 1 1 4 0v1.5" stroke="#545456" strokeWidth="1.1" strokeLinecap="round" />
//   </svg>
// );






// cat > /mnt/user-data/outputs/RampWidgetModal.tsx << 'ENDOFFILE'
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { useRamp } from "./RampContext";
import { useAuth } from "../../context/AuthContext";
import ConnectModal from "../wallet/ConnectModal";

// ─── Quidax types ────────────────────────────────────────────────────────
interface QuidaxWalletDetails {
  amount: string;
  network: string;
  walletAddress: string;
}

interface QuidaxTransaction {
  reference: string;
  status: string;
  [key: string]: any;
}

declare global {
  interface Window {
    ramp?: { initialize: (config: QuidaxRampConfig) => void };
  }
}

interface QuidaxRampConfig {
  public_key: string;
  reference: string;
  from_currency: string;
  to_currency: string;
  from_amount: string;
  mode: "buy" | "sell";
  network: string;
  address?: string;
  onClose: (ref: string) => void;
  onReceiveWalletDetails: (details: QuidaxWalletDetails) => void;
  onSuccess: (transaction: QuidaxTransaction) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────
// Delivery networks Quidax supports for USDT (per Quidax docs: bep20, erc20,
// trc20, celo). `code` is the exact value Quidax expects; `value` is our UI id.
// Celo is first/default because DezenFoods runs on Celo, so USDT bought on Celo
// lands directly in the user's connected wallet. TRC20 (Tron) uses a different
// address format (T...), so a connected EVM wallet can't use it.
const NETWORK_OPTIONS = [
  { value: "CELO", code: "celo", label: "Celo (CELO)", hint: "Recommended - lands in your DezenFoods wallet", evm: true },
  { value: "BEP20", code: "bep20", label: "BNB Smart Chain (BEP20)", hint: "Low fees", evm: true },
  { value: "ERC20", code: "erc20", label: "Ethereum (ERC20)", hint: "Higher fees", evm: true },
  { value: "TRC20", code: "trc20", label: "Tron (TRC20)", hint: "For Tron wallets", evm: false },
] as const;
const NETWORKS = NETWORK_OPTIONS.map((n) => n.value);
const DEFAULT_NETWORK: Network = "CELO";
type Network = typeof NETWORK_OPTIONS[number]["value"];

const networkOption = (n: Network) => NETWORK_OPTIONS.find((o) => o.value === n);
const isEvmNetwork = (n: Network) => networkOption(n)?.evm ?? true;
/** The network code Quidax expects (lowercase, e.g. "celo"). */
const quidaxNetworkCode = (n: Network) => networkOption(n)?.code ?? "celo";
const isEvmAddress = (a: string) => /^0x[a-fA-F0-9]{40}$/.test(a.trim());
const isTronAddress = (a: string) => /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a.trim());

// ─── Icons ───────────────────────────────────────────────────────────────
const X = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const ArrowDown = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckCircle = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="22" stroke="#22c55e" strokeWidth="2.5" />
    <path d="M14 24l8 8 12-14" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlertCircle = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="18" stroke="#ef4444" strokeWidth="2" />
    <path d="M20 12v10M20 26v2" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
const ExternalLink = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8M8 1h4m0 0v4m0-4L5.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Spinner ─────────────────────────────────────────────────────────────
const Spinner = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={{ animation: "qdx-spin 0.8s linear infinite" }}>
    <circle cx="10" cy="10" r="7" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" fill="none" />
    <path d="M10 3a7 7 0 0 1 7 7" stroke="#E23B3B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <style>{`@keyframes qdx-spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────
const genRef = () =>
  `DZM-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const RAMP_SCRIPT_URL = "https://d309lcjd52k0i0.cloudfront.net/ramp.js";

function useQuidaxScript(): "idle" | "loading" | "ready" | "error" {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    () => (window.ramp ? "ready" : "idle")
  );
  useEffect(() => {
    if (window.ramp) { setStatus("ready"); return; }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAMP_SCRIPT_URL}"]`);
    if (existing) {
      const check = setInterval(() => { if (window.ramp) { setStatus("ready"); clearInterval(check); } }, 100);
      return () => clearInterval(check);
    }
    setStatus("loading");
    const script = document.createElement("script");
    script.src = RAMP_SCRIPT_URL;
    script.async = true;
    script.onload = () => setStatus("ready");
    script.onerror = () => setStatus("error");
    document.head.appendChild(script);
  }, []);
  return status;
}

// ─── CopyButton ───────────────────────────────────────────────────────────
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: "none", border: "none", color: copied ? "#22c55e" : "#E23B3B", fontSize: "11px", cursor: "pointer", fontWeight: 500, padding: 0 }}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
};

// ─── DetailRow ────────────────────────────────────────────────────────────
const DetailRow = ({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #2F3136" }}>
    <span style={{ color: "#C6C6C8", fontSize: "12px" }}>{label}</span>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ color: "#fff", fontSize: "13px", fontWeight: 500, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
      {copyable && <CopyButton text={value} />}
    </div>
  </div>
);

// ─── Steps ────────────────────────────────────────────────────────────────
type WidgetStep = "form" | "launching" | "active" | "success" | "error";

// ─── Main Component ───────────────────────────────────────────────────────
export const RampWidgetModal = () => {
  const { isOpen, mode, setMode, closeRamp, widgetConfig, customer } = useRamp();
  const scriptStatus = useQuidaxScript();
  const { address, isConnected } = useAccount();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showConnect, setShowConnect] = useState(false);

  // Form state - collected before handing off to the widget
  const [fromAmount, setFromAmount] = useState("");
  const [network, setNetwork] = useState<Network>(DEFAULT_NETWORK);
  const [walletAddress, setWalletAddress] = useState("");
  const [amountError, setAmountError] = useState("");
  const [walletError, setWalletError] = useState("");

  // Widget lifecycle state
  const [step, setStep] = useState<WidgetStep>("form");
  const [widgetError, setWidgetError] = useState("");
  const [successTx, setSuccessTx] = useState<QuidaxTransaction | null>(null);
  const [walletDetails, setWalletDetails] = useState<QuidaxWalletDetails | null>(null);
  const currentRef = useRef(genRef());

  // Reset when modal opens or mode switches. Pre-fill the buy address with the
  // connected wallet so users don't paste it by hand (an explicit default wins).
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setFromAmount(widgetConfig?.defaultAmount ?? "");
      setNetwork((widgetConfig?.defaultNetwork as Network) ?? DEFAULT_NETWORK);
      setWalletAddress(widgetConfig?.defaultAddress ?? address ?? "");
      setAmountError("");
      setWalletError("");
      setWidgetError("");
      setSuccessTx(null);
      setWalletDetails(null);
      currentRef.current = genRef();
    }
  }, [isOpen, mode, widgetConfig, address]);

  // If the wallet connects while the form is open and the field is still empty,
  // fill it in - but never clobber an address the user has already typed.
  useEffect(() => {
    if (isOpen && mode === "onramp" && address && !walletAddress.trim()) {
      setWalletAddress(address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isOpen, mode]);

  const validate = () => {
    let ok = true;
    if (!fromAmount || isNaN(+fromAmount) || +fromAmount <= 0) {
      setAmountError("Enter a valid amount");
      ok = false;
    } else setAmountError("");
    if (mode === "onramp") {
      const addr = walletAddress.trim();
      if (!addr) {
        setWalletError("Enter your wallet address");
        ok = false;
      } else if (isEvmNetwork(network) && !isEvmAddress(addr)) {
        setWalletError("Enter a valid 0x… address for this network");
        ok = false;
      } else if (!isEvmNetwork(network) && !isTronAddress(addr)) {
        setWalletError("TRC20 needs a Tron (T…) address");
        ok = false;
      } else setWalletError("");
    } else setWalletError("");
    return ok;
  };

  const launchWidget = useCallback(() => {
    if (!widgetConfig?.publicKey) {
      setWidgetError("No public key configured. Pass widgetConfig.publicKey to <RampProvider>.");
      setStep("error");
      return;
    }
    if (scriptStatus !== "ready" || !window.ramp) {
      setWidgetError("Quidax widget script failed to load.");
      setStep("error");
      return;
    }

    setStep("launching");

    const isBuy = mode === "onramp";

    const config: QuidaxRampConfig = {
      public_key: widgetConfig.publicKey,
      reference: currentRef.current,
      // ← values collected from our form, not hardcoded defaults
      from_currency: isBuy ? "ngn" : "usdt",
      to_currency: isBuy ? "usdt" : "ngn",
      from_amount: fromAmount,
      mode: isBuy ? "buy" : "sell",
      network: quidaxNetworkCode(network),
      ...(isBuy && walletAddress ? { address: walletAddress } : {}),
      onClose: (ref) => {
        console.log("[Quidax Ramp] closed", ref);
        setStep((s) => (s === "launching" || s === "active" ? "active" : s));
      },
      onReceiveWalletDetails: (details) => {
        console.log("[Quidax Ramp] wallet details", details);
        setWalletDetails(details);
        setStep("active");
      },
      onSuccess: (tx) => {
        console.log("[Quidax Ramp] success", tx);
        setSuccessTx(tx);
        setStep("success");
      },
    };

    try {
      window.ramp.initialize(config);
      setTimeout(() => setStep((s) => (s === "launching" ? "active" : s)), 1000);
    } catch (e: any) {
      setWidgetError(e?.message ?? "Failed to launch widget");
      setStep("error");
    }
  }, [mode, scriptStatus, widgetConfig, fromAmount, network, walletAddress]);

  const handleContinue = () => {
    if (!validate()) return;
    launchWidget();
  };

  if (!isOpen) return null;

  // ─── Tab switcher (shared across all steps) ───────────────────────────
  const TabSwitcher = () => (
    <div style={{ display: "flex", background: "#212428", padding: "4px", borderRadius: "10px", gap: "2px" }}>
      {(["onramp", "offramp"] as const).map((m) => (
        <button key={m} onClick={() => { setMode(m); setStep("form"); }}
          style={{
            padding: "6px 16px", borderRadius: "7px", fontSize: "13px", fontWeight: 600,
            border: "none", cursor: "pointer", transition: "all 0.18s",
            background: mode === m ? "#E23B3B" : "transparent",
            color: mode === m ? "#fff" : "#C6C6C8",
          }}>
          {m === "onramp" ? "Buy Crypto" : "Sell Crypto"}
        </button>
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeRamp}
            style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }} />

          {/* Shell */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            style={{ position: "fixed", inset: 0, zIndex: 51, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", pointerEvents: "none" }}
          >
            <div onClick={(e) => e.stopPropagation()}
              style={{ background: "#1A1C20", width: "100%", maxWidth: "440px", borderRadius: "20px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", pointerEvents: "auto", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #2F3136" }}>
                <TabSwitcher />
                <button onClick={closeRamp}
                  style={{ background: "none", border: "none", color: "#545456", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", transition: "color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#545456")}>
                  <X />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "24px 20px" }}>
                <AnimatePresence mode="wait">

                  {/* ── FORM ─────────────────────────────────────────── */}
                  {step === "form" && (
                    <motion.div key="form" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                      style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                      <p style={{ color: "#C6C6C8", fontSize: "13px", margin: 0 }}>
                        {mode === "onramp"
                          ? "Enter how much NGN to spend, then get your live rate."
                          : "Enter how much USDT to sell, then get your live rate."}
                      </p>

                      {/* Amount input */}
                      <div style={{ background: "#292B30", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#C6C6C8", fontSize: "12px" }}>
                            {mode === "onramp" ? "You pay" : "You sell"}
                          </span>
                          <span style={{ color: "#545456", fontSize: "11px", background: "#1A1C20", padding: "2px 8px", borderRadius: "6px" }}>
                            {mode === "onramp" ? "NGN" : "USDT"}
                          </span>
                        </div>
                        <input
                          type="number" min="0" value={fromAmount}
                          onChange={(e) => { setFromAmount(e.target.value); setAmountError(""); }}
                          placeholder={mode === "onramp" ? "e.g. 5000" : "e.g. 5"}
                          style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "28px", fontWeight: 700, width: "100%", caretColor: "#E23B3B" }}
                        />
                        {amountError && <p style={{ color: "#f87171", fontSize: "12px", margin: 0 }}>{amountError}</p>}
                      </div>

                      <div style={{ display: "flex", justifyContent: "center", color: "#545456" }}><ArrowDown /></div>

                      {/* To currency (read-only preview) */}
                      {/*<div style={{ background: "#292B30", borderRadius: "14px", padding: "16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ color: "#C6C6C8", fontSize: "12px" }}>
                            {mode === "onramp" ? "You receive" : "You receive"}
                          </span>
                          <span style={{ color: "#545456", fontSize: "11px", background: "#1A1C20", padding: "2px 8px", borderRadius: "6px" }}>
                            {mode === "onramp" ? "USDT" : "NGN"}
                          </span>
                        </div>
                        <p style={{ color: "#3A3C40", fontSize: "28px", fontWeight: 700, margin: 0 }}>-</p>
                        <p style={{ color: "#545456", fontSize: "11px", margin: "6px 0 0", display: "flex", alignItems: "center", gap: "4px" }}>
                          <ExternalLink /> Rate shown in Quidax widget
                        </p>
                      </div>*/}

                      {/* Network selector */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ color: "#C6C6C8", fontSize: "12px", fontWeight: 500 }}>
                          Delivery network
                        </label>
                        <div style={{ position: "relative", background: "#212428", borderRadius: "10px", border: "1px solid transparent" }}>
                          <select value={network} onChange={(e) => { setNetwork(e.target.value as Network); setWalletError(""); }}
                            style={{ width: "100%", background: "transparent", color: "#fff", padding: "12px 36px 12px 12px", fontSize: "13px", border: "none", outline: "none", appearance: "none", cursor: "pointer" }}>
                            {NETWORK_OPTIONS.map((n) => (
                              <option key={n.value} value={n.value} style={{ background: "#212428" }}>
                                {n.label} · {n.hint}
                              </option>
                            ))}
                          </select>
                          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#545456", pointerEvents: "none" }}><ChevronDown /></span>
                        </div>
                        <p style={{ color: "#545456", fontSize: "11px", margin: 0 }}>
                          {mode === "onramp"
                            ? "The blockchain your USDT is delivered on. Not sure? The default works with most wallets."
                            : "The blockchain you'll send USDT from."}
                        </p>
                      </div>

                      {/* Wallet address (onramp only) */}
                      {mode === "onramp" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <label style={{ color: "#C6C6C8", fontSize: "12px", fontWeight: 500 }}>Wallet address (where USDT is sent)</label>
                            {!isConnected && (
                              <button
                                type="button"
                                onClick={() => setShowConnect(true)}
                                style={{ background: "none", border: "none", color: "#E23B3B", fontSize: "11px", fontWeight: 600, cursor: "pointer", padding: 0 }}
                              >
                                Connect wallet
                              </button>
                            )}
                          </div>
                          <input
                            value={walletAddress}
                            onChange={(e) => { setWalletAddress(e.target.value); setWalletError(""); }}
                            placeholder="Paste a wallet address, or connect your wallet"
                            style={{
                              background: "#212428", color: "#fff", padding: "12px", borderRadius: "10px", fontSize: "13px",
                              border: walletError ? "1px solid #ef4444" : "1px solid transparent",
                              outline: "none", fontFamily: "monospace",
                            }}
                          />
                          {walletError ? (
                            <p style={{ color: "#f87171", fontSize: "12px", margin: 0 }}>{walletError}</p>
                          ) : isConnected && walletAddress.trim().toLowerCase() === address?.toLowerCase() ? (
                            <p style={{ color: "#22c55e", fontSize: "11px", margin: 0 }}>✓ Using your connected wallet</p>
                          ) : (
                            <p style={{ color: "#545456", fontSize: "11px", margin: 0 }}>
                              Double-check this. Crypto sent to the wrong address can't be recovered.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Script still loading */}
                      {scriptStatus === "loading" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#C6C6C8", fontSize: "12px" }}>
                          <Spinner size={14} /> Loading secure widget…
                        </div>
                      )}
                      {scriptStatus === "error" && (
                        <p style={{ color: "#f87171", fontSize: "12px", margin: 0 }}>
                          ⚠️ Could not load the Quidax widget. Check your connection.
                        </p>
                      )}

                      <button
                        onClick={handleContinue}
                        disabled={scriptStatus !== "ready"}
                        style={{
                          width: "100%", background: scriptStatus !== "ready" ? "#3A3C40" : "#E23B3B",
                          color: "#fff", border: "none", borderRadius: "12px", padding: "14px",
                          fontSize: "14px", fontWeight: 600, cursor: scriptStatus !== "ready" ? "not-allowed" : "pointer",
                          transition: "background 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        }}
                        onMouseEnter={(e) => { if (scriptStatus === "ready") e.currentTarget.style.background = "#c52f2f"; }}
                        onMouseLeave={(e) => { if (scriptStatus === "ready") e.currentTarget.style.background = "#E23B3B"; }}
                      >
                        Get Rate <ExternalLink />
                      </button>
                      <p style={{ color: "#545456", fontSize: "11px", textAlign: "center", margin: "-6px 0 0" }}>
                        You'll see the live rate and exactly what you receive next.
                      </p>

                      {/* Who's transacting - surface a real identity, prompt login otherwise */}
                      {isAuthenticated ? (
                        <p style={{ color: "#545456", fontSize: "11px", textAlign: "center", margin: 0 }}>
                          Transacting as <span style={{ color: "#C6C6C8" }}>{customer.email}</span>
                        </p>
                      ) : (
                        <p style={{ color: "#545456", fontSize: "11px", textAlign: "center", margin: 0 }}>
                          Not signed in.{" "}
                          <button
                            type="button"
                            onClick={() => { closeRamp(); navigate("/login"); }}
                            style={{ background: "none", border: "none", color: "#E23B3B", fontSize: "11px", fontWeight: 600, cursor: "pointer", padding: 0 }}
                          >
                            Log in
                          </button>{" "}
                          for a smoother experience.
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* ── LAUNCHING ─────────────────────────────────────── */}
                  {step === "launching" && (
                    <motion.div key="launching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "32px 0" }}>
                      <Spinner size={36} />
                      <div style={{ textAlign: "center" }}>
                        <p style={{ color: "#fff", fontWeight: 600, margin: "0 0 6px" }}>Opening Quidax…</p>
                        <p style={{ color: "#C6C6C8", fontSize: "13px", margin: 0 }}>
                          {mode === "onramp" ? `Buying USDT with NGN ${fromAmount}` : `Selling USDT ${fromAmount} for NGN`}
                          {" "}on {network}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── ACTIVE (widget open externally) ───────────────── */}
                  {step === "active" && (
                    <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

                      {/* Summary of what was sent to the widget */}
                      <div style={{ background: "#292B30", borderRadius: "14px", overflow: "hidden" }}>
                        <div style={{ background: "rgba(226,59,59,0.08)", padding: "12px 16px", borderBottom: "1px solid #2F3136", display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <p style={{ color: "#C6C6C8", fontSize: "11px", margin: "0 0 2px" }}>{mode === "onramp" ? "You're buying" : "You're selling"}</p>
                            <p style={{ color: "#fff", fontWeight: 700, fontSize: "16px", margin: 0 }}>
                              {mode === "onramp" ? `NGN ${fromAmount}` : `USDT ${fromAmount}`}
                            </p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ color: "#C6C6C8", fontSize: "11px", margin: "0 0 2px" }}>Network</p>
                            <p style={{ color: "#E23B3B", fontWeight: 600, fontSize: "14px", margin: 0 }}>{network}</p>
                          </div>
                        </div>
                        <div style={{ padding: "0 16px" }}>
                          <DetailRow label="Reference" value={currentRef.current} copyable />
                          {mode === "onramp" && walletAddress && (
                            <DetailRow label="Wallet" value={`${walletAddress.slice(0, 10)}…${walletAddress.slice(-6)}`} copyable />
                          )}
                        </div>
                      </div>

                      {walletDetails && (
                        <div style={{ background: "#292B30", borderRadius: "12px", padding: "14px 16px" }}>
                          <p style={{ color: "#C6C6C8", fontSize: "11px", fontWeight: 600, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Payment Details Received
                          </p>
                          {walletDetails.walletAddress && <DetailRow label="Address" value={walletDetails.walletAddress} copyable />}
                          {walletDetails.network && <DetailRow label="Network" value={walletDetails.network} />}
                          {walletDetails.amount && <DetailRow label="Amount" value={walletDetails.amount} />}
                        </div>
                      )}

                      <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "12px", padding: "12px 14px", fontSize: "12px", color: "#fbbf24" }}>
                        💡 Complete your transaction in the Quidax window. This screen updates when it's confirmed.
                      </div>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={launchWidget}
                          style={{ flex: 1, background: "#292B30", color: "#C6C6C8", border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#C6C6C8")}>
                          Reopen Widget
                        </button>
                        <button onClick={() => setStep("form")}
                          style={{ flex: 1, background: "transparent", color: "#545456", border: "1px solid #2F3136", borderRadius: "12px", padding: "12px", fontSize: "13px", cursor: "pointer" }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#545456"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "#545456"; e.currentTarget.style.borderColor = "#2F3136"; }}>
                          Edit Amount
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── SUCCESS ───────────────────────────────────────── */}
                  {step === "success" && (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "16px 0" }}>
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10, stiffness: 200, delay: 0.1 }}>
                        <CheckCircle />
                      </motion.div>
                      <div style={{ textAlign: "center" }}>
                        <h3 style={{ color: "#fff", fontWeight: 700, fontSize: "18px", margin: "0 0 6px" }}>
                          {mode === "onramp" ? "Purchase Successful!" : "Sale Confirmed!"}
                        </h3>
                        <p style={{ color: "#C6C6C8", fontSize: "13px", margin: 0 }}>
                          {mode === "onramp"
                            ? "Your USDT will arrive in your wallet shortly."
                            : "NGN will be credited to your bank account shortly."}
                        </p>
                      </div>
                      <div style={{ width: "100%", background: "#292B30", borderRadius: "12px", padding: "0 16px" }}>
                        <DetailRow label={mode === "onramp" ? "NGN Sent" : "USDT Sold"} value={`${mode === "onramp" ? "NGN" : "USDT"} ${fromAmount}`} />
                        <DetailRow label="Network" value={network} />
                        <DetailRow label="Reference" value={successTx?.reference ?? currentRef.current} copyable />
                        {successTx?.status && <DetailRow label="Status" value={successTx.status} />}
                      </div>
                      <button onClick={closeRamp}
                        style={{ width: "100%", background: "#E23B3B", color: "#fff", border: "none", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#c52f2f")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#E23B3B")}>
                        Done
                      </button>
                    </motion.div>
                  )}

                  {/* ── ERROR ─────────────────────────────────────────── */}
                  {step === "error" && (
                    <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "16px 0" }}>
                      <AlertCircle />
                      <div style={{ textAlign: "center" }}>
                        <h3 style={{ color: "#fff", fontWeight: 700, fontSize: "16px", margin: "0 0 6px" }}>Something went wrong</h3>
                        <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>{widgetError}</p>
                      </div>
                      <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                        <button onClick={() => { setStep("form"); setWidgetError(""); }}
                          style={{ flex: 1, background: "#E23B3B", color: "#fff", border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                          Try Again
                        </button>
                        <button onClick={closeRamp}
                          style={{ flex: 1, background: "#292B30", color: "#C6C6C8", border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", cursor: "pointer" }}>
                          Close
                        </button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Footer */}
              <div style={{ padding: "12px 20px", borderTop: "1px solid #2F3136", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                <LockIcon />
                <span style={{ color: "#545456", fontSize: "11px" }}>
                  Secured by Quidax · {currentRef.current}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Wallet connect (opened from the address field when disconnected) */}
          {showConnect && <ConnectModal onClose={() => setShowConnect(false)} />}
        </>
      )}
    </AnimatePresence>
  );
};

const LockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <rect x="1" y="4.5" width="9" height="6" rx="1.2" stroke="#545456" strokeWidth="1.1" />
    <path d="M3.5 4.5V3a2 2 0 1 1 4 0v1.5" stroke="#545456" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

