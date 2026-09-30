import React from "react";
import { motion } from "framer-motion";
import { FaStar, FaCheck } from "react-icons/fa";
import type { DeliveryAddress } from "../../../utils/types";

interface AddressCardProps {
  address: DeliveryAddress;
  /** Render as a selectable option (checkout). */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  /** Action buttons row (edit / delete / set-default), rendered below the body. */
  actions?: React.ReactNode;
  /** Extra content (e.g. inline delete confirmation) rendered above actions. */
  children?: React.ReactNode;
}

const AddressCard: React.FC<AddressCardProps> = ({
  address,
  selectable = false,
  selected = false,
  onSelect,
  actions,
  children,
}) => {
  const borderClass = selectable
    ? selected
      ? "border-brand bg-brand/10"
      : "border-transparent hover:border-gray-600"
    : address.isDefault
    ? "border-brand"
    : "border-transparent";

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{address.label}</span>
            {address.isDefault && (
              <span className="flex items-center gap-1 text-xs bg-brand text-white px-1.5 py-0.5 rounded font-medium">
                <FaStar className="w-2.5 h-2.5" />
                Default
              </span>
            )}
          </div>
          <p className="text-gray-300 text-sm mt-0.5">{address.fullName}</p>
          <p className="text-gray-400 text-xs">{address.phone}</p>
        </div>
        {selectable && selected && (
          <FaCheck className="text-red-500 w-5 h-5 flex-shrink-0 mt-0.5" />
        )}
      </div>

      <div className="text-gray-400 text-xs space-y-0.5 mt-2">
        <p>{address.street}</p>
        <p>
          {address.lga}, {address.state}
          {address.zipCode ? ` ${address.zipCode}` : ""}
        </p>
        <p>{address.country}</p>
      </div>
    </>
  );

  const baseClass = `w-full text-left bg-[#292B30] rounded-xl p-4 border-2 transition-colors ${borderClass}`;

  if (selectable) {
    return (
      <motion.button
        type="button"
        onClick={onSelect}
        layout
        className={baseClass}
        whileTap={{ scale: 0.98 }}
      >
        {body}
      </motion.button>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={baseClass}
    >
      {body}
      {children && <div className="mt-3">{children}</div>}
      {actions && <div className="flex gap-2 mt-4">{actions}</div>}
    </motion.div>
  );
};

export default AddressCard;
