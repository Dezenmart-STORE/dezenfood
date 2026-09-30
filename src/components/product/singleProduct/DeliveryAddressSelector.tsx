import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaMapMarkerAlt, FaStar } from 'react-icons/fa';
import {
  useGetDeliveryAddressesQuery,
  useCreateDeliveryAddressMutation,
} from '../../../store/api';
import type { DeliveryAddress, CreateDeliveryAddressParams } from '../../../utils/types';
import LoadingSpinner from '../../common/LoadingSpinner';
import AddressCard from '../../account/address/AddressCard';
import AddressForm from '../../account/address/AddressForm';

interface DeliveryAddressSelectorProps {
  selectedAddress: DeliveryAddress | null;
  onAddressSelect: (address: DeliveryAddress) => void;
}

const DeliveryAddressSelector: React.FC<DeliveryAddressSelectorProps> = ({
  selectedAddress,
  onAddressSelect,
}) => {
  const { data: addresses = [], isLoading, isError, refetch } =
    useGetDeliveryAddressesQuery();
  const [createAddress, { isLoading: isCreating }] = useCreateDeliveryAddressMutation();

  const [showAddForm, setShowAddForm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // No dedicated "default" endpoint - derive it from the list.
  const defaultAddress = useMemo(
    () => addresses.find((a) => a.isDefault) ?? addresses[0] ?? null,
    [addresses]
  );

  // Auto-select the default (or first) address once, when nothing is chosen yet.
  useEffect(() => {
    if (!selectedAddress && defaultAddress) {
      onAddressSelect(defaultAddress);
    }
  }, [defaultAddress, selectedAddress, onAddressSelect]);

  const handleSelect = (address: DeliveryAddress) => {
    onAddressSelect(address);
    setExpanded(false);
  };

  const handleCreateAddress = async (values: CreateDeliveryAddressParams) => {
    try {
      const newAddress = await createAddress(values).unwrap();
      onAddressSelect(newAddress);
      setShowAddForm(false);
      setExpanded(false);
    } catch (error) {
      console.error('Failed to create address:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  // Collapse to a one-glance summary once an address is picked.
  const collapsed =
    !!selectedAddress && !expanded && !showAddForm && !isError && addresses.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FaMapMarkerAlt className="text-brand" />
          Delivery Address
        </h3>
        {collapsed ? (
          <button
            onClick={() => setExpanded(true)}
            className="text-brand hover:opacity-80 text-sm transition-colors"
          >
            Change
          </button>
        ) : addresses.length > 0 && !showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-brand hover:opacity-80 text-sm flex items-center gap-1 transition-colors"
          >
            <FaPlus className="w-3 h-3" />
            Add New
          </button>
        ) : null}
      </div>

      {collapsed && selectedAddress ? (
        <div className="bg-[#292B30] rounded-xl p-3 border border-brand/40">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white text-sm font-medium">{selectedAddress.label}</span>
            {selectedAddress.isDefault && (
              <span className="flex items-center gap-1 text-xs bg-brand text-white px-1.5 py-0.5 rounded font-medium">
                <FaStar className="w-2.5 h-2.5" />
                Default
              </span>
            )}
          </div>
          <p className="text-gray-300 text-xs mt-0.5">
            {selectedAddress.fullName} · {selectedAddress.phone}
          </p>
          <p className="text-gray-400 text-xs truncate">
            {selectedAddress.street}, {selectedAddress.lga}, {selectedAddress.state}
          </p>
        </div>
      ) : (
        <>
          {/* Add Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#1a1c20] rounded-xl p-4 border border-[#3A3A3C] overflow-hidden"
              >
                <h4 className="text-sm font-semibold text-white mb-3">New Address</h4>
                <AddressForm
                  onSubmit={handleCreateAddress}
                  onCancel={() => setShowAddForm(false)}
                  isSaving={isCreating}
                  submitLabel="Save & Use"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {isError ? (
            <div className="text-center py-8 bg-[#1a1c20] rounded-xl border border-[#3A3A3C]">
              <p className="text-gray-400 mb-3">Couldn't load your addresses</p>
              <button
                onClick={() => refetch()}
                className="text-brand hover:opacity-80 text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          ) : addresses.length === 0 && !showAddForm ? (
            <div className="text-center py-8 bg-[#1a1c20] rounded-xl border border-[#3A3A3C]">
              <FaMapMarkerAlt className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400 mb-2">No saved addresses</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="text-brand hover:opacity-80 text-sm flex items-center gap-1 mx-auto transition-colors"
              >
                <FaPlus className="w-3 h-3" />
                Add your first delivery address
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
              {addresses.map((address) => (
                <AddressCard
                  key={address._id}
                  address={address}
                  selectable
                  selected={selectedAddress?._id === address._id}
                  onSelect={() => handleSelect(address)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DeliveryAddressSelector;
