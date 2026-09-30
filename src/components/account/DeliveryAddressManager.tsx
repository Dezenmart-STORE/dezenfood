import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaEdit, FaTrash, FaStar, FaMapMarkerAlt } from "react-icons/fa";
import { LiaAngleLeftSolid } from "react-icons/lia";
import {
  useGetDeliveryAddressesQuery,
  useCreateDeliveryAddressMutation,
  useUpdateDeliveryAddressMutation,
  useDeleteDeliveryAddressMutation,
  useSetDefaultDeliveryAddressMutation,
} from "../../store/api";
import { useSnackbar } from "../../context/SnackbarContext";
import type {
  DeliveryAddress,
  CreateDeliveryAddressParams,
} from "../../utils/types";
import LoadingSpinner from "../common/LoadingSpinner";
import AddressCard from "./address/AddressCard";
import AddressForm from "./address/AddressForm";

interface Props {
  onBack?: () => void;
}

const DeliveryAddressManager: React.FC<Props> = ({ onBack }) => {
  const { data: addresses = [], isLoading, isError, refetch } =
    useGetDeliveryAddressesQuery();
  const [createAddress, { isLoading: isCreating }] = useCreateDeliveryAddressMutation();
  const [updateAddress, { isLoading: isUpdating }] = useUpdateDeliveryAddressMutation();
  const [deleteAddress] = useDeleteDeliveryAddressMutation();
  const [setDefaultAddress] = useSetDefaultDeliveryAddressMutation();
  const { showSnackbar } = useSnackbar();

  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null); // per-row busy

  const openCreate = () => {
    setEditingAddress(null);
    setShowForm(true);
  };

  const openEdit = (addr: DeliveryAddress) => {
    setEditingAddress(addr);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingAddress(null);
  };

  const handleSubmit = async (values: CreateDeliveryAddressParams) => {
    try {
      if (editingAddress) {
        await updateAddress({ _id: editingAddress._id, ...values }).unwrap();
        showSnackbar("Address updated", "success");
      } else {
        await createAddress(values).unwrap();
        showSnackbar("Address saved", "success");
      }
      closeForm();
    } catch {
      showSnackbar("Failed to save address. Please try again.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    setPendingId(id);
    try {
      await deleteAddress(id).unwrap();
      showSnackbar("Address removed", "success");
    } catch {
      showSnackbar("Failed to delete address.", "error");
    } finally {
      setPendingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setPendingId(id);
    try {
      await setDefaultAddress(id).unwrap();
      showSnackbar("Default address updated", "success");
    } catch {
      showSnackbar("Failed to set default address.", "error");
    } finally {
      setPendingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <LoadingSpinner />
      </div>
    );
  }

  // ── Address Form ──────────────────────────────────────────────────────
  if (showForm) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={closeForm}
            aria-label="Back"
            className="p-2 rounded-full hover:bg-[#292B30] transition-colors"
          >
            <LiaAngleLeftSolid className="text-white text-xl" />
          </button>
          <h2 className="text-xl font-bold text-white">
            {editingAddress ? "Edit Address" : "New Address"}
          </h2>
        </div>

        <AddressForm
          initialValues={
            editingAddress
              ? {
                  label: editingAddress.label,
                  fullName: editingAddress.fullName,
                  phone: editingAddress.phone,
                  street: editingAddress.street,
                  lga: editingAddress.lga,
                  state: editingAddress.state,
                  country: editingAddress.country,
                  zipCode: editingAddress.zipCode,
                  isDefault: editingAddress.isDefault,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={closeForm}
          isSaving={isCreating || isUpdating}
          submitLabel={editingAddress ? "Update Address" : "Save Address"}
        />
      </motion.div>
    );
  }

  // ── Address List ──────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="p-2 rounded-full hover:bg-[#292B30] transition-colors"
          >
            <LiaAngleLeftSolid className="text-white text-xl" />
          </button>
        )}
        <h2 className="text-xl font-bold text-white flex-1">Delivery Addresses</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white px-3 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <FaPlus className="w-3 h-3" />
          Add
        </button>
      </div>

      {isError ? (
        <div className="text-center py-16 bg-[#292B30] rounded-2xl">
          <p className="text-gray-300 font-medium">Couldn't load your addresses</p>
          <button
            onClick={() => refetch()}
            className="mt-4 bg-brand hover:bg-brand-hover text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-16 bg-[#292B30] rounded-2xl">
          <FaMapMarkerAlt className="w-10 h-10 mx-auto text-gray-600 mb-4" />
          <p className="text-gray-300 font-medium">No delivery addresses yet</p>
          <p className="text-gray-500 text-sm mt-1">
            Add an address so sellers know where to deliver.
          </p>
          <button
            onClick={openCreate}
            className="mt-4 bg-brand hover:bg-brand-hover text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            Add Address
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {addresses.map((addr) => {
              const busy = pendingId === addr._id;
              return (
                <AddressCard
                  key={addr._id}
                  address={addr}
                  actions={
                    <>
                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefault(addr._id)}
                          disabled={busy}
                          className="flex-1 bg-[#3A3A3C] hover:bg-[#484A4E] disabled:opacity-50 text-gray-300 hover:text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                        >
                          <FaStar className="w-3 h-3" />
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(addr)}
                        className="flex-1 bg-[#3A3A3C] hover:bg-[#484A4E] text-gray-300 hover:text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <FaEdit className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          setConfirmDeleteId(
                            confirmDeleteId === addr._id ? null : addr._id
                          )
                        }
                        className="flex-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        <FaTrash className="w-3 h-3" />
                        Delete
                      </button>
                    </>
                  }
                >
                  <AnimatePresence>
                    {confirmDeleteId === addr._id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-lg border border-red-800/50 bg-red-900/20 p-3 text-sm overflow-hidden"
                      >
                        <p className="text-red-300 font-medium mb-2">
                          Remove this address?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(addr._id)}
                            disabled={busy}
                            className="flex-1 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white py-1.5 rounded-lg text-xs font-semibold transition-colors"
                          >
                            {busy ? "Removing…" : "Yes, Remove"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="flex-1 bg-[#3A3A3C] hover:bg-[#4A4A4C] text-white py-1.5 rounded-lg text-xs font-medium transition-colors"
                          >
                            Keep
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </AddressCard>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default DeliveryAddressManager;
