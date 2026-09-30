import React, { useMemo, useState } from "react";
import { HiCheckCircle } from "react-icons/hi2";
import type { CreateDeliveryAddressParams } from "../../../utils/types";
import {
  useGetNigerianStatesQuery,
  useGetStateLgasQuery,
} from "../../../store/api";
import LoadingSpinner from "../../common/LoadingSpinner";
import { BLANK_ADDRESS, FALLBACK_STATES } from "./constants";

type Values = CreateDeliveryAddressParams;
type FieldKey = keyof Values;
type Errors = Partial<Record<FieldKey, string>>;

interface AddressFormProps {
  initialValues?: Values;
  onSubmit: (values: Values) => void | Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
  submitLabel?: string;
  /** Hide the "set as default" toggle (e.g. when forced default). */
  showDefaultToggle?: boolean;
}

const REQUIRED: FieldKey[] = [
  "label",
  "fullName",
  "phone",
  "street",
  "lga",
  "state",
  "country",
  "zipCode",
];

const validate = (v: Values): Errors => {
  const errors: Errors = {};
  REQUIRED.forEach((key) => {
    if (!String(v[key] ?? "").trim()) errors[key] = "Required";
  });
  const digits = v.phone.replace(/[^\d]/g, "");
  if (v.phone.trim() && digits.length < 7) {
    errors.phone = "Enter a valid phone number";
  }
  return errors;
};

const AddressForm: React.FC<AddressFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  isSaving = false,
  submitLabel = "Save Address",
  showDefaultToggle = true,
}) => {
  const [values, setValues] = useState<Values>(initialValues ?? BLANK_ADDRESS);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});

  // States + LGAs come from the backend; LGAs depend on the selected state.
  const { data: fetchedStates = [] } = useGetNigerianStatesQuery();
  const states = fetchedStates.length ? fetchedStates : FALLBACK_STATES;
  const { data: fetchedLgas = [], isFetching: lgasFetching } = useGetStateLgasQuery(
    values.state,
    { skip: !values.state }
  );
  // Keep a prefilled LGA selectable even if it isn't in the fetched list (legacy data).
  const lgaOptions = useMemo(() => {
    if (values.lga && !fetchedLgas.includes(values.lga)) {
      return [values.lga, ...fetchedLgas];
    }
    return fetchedLgas;
  }, [fetchedLgas, values.lga]);

  const setField = (key: FieldKey, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Changing the state clears the LGA (it belongs to the old state).
  const handleStateChange = (state: string) => {
    setValues((prev) => ({ ...prev, state, lga: "" }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.state;
      return next;
    });
  };

  const handleBlur = (key: FieldKey) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const fieldErrors = validate(values);
    setErrors((prev) => ({ ...prev, [key]: fieldErrors[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validate(values);
    if (Object.values(fieldErrors).some(Boolean)) {
      setErrors(fieldErrors);
      setTouched(
        REQUIRED.reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<FieldKey, boolean>)
      );
      return;
    }
    await onSubmit(values);
  };

  const showError = (key: FieldKey) => touched[key] && errors[key];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="Label"
          placeholder="Home, Office…"
          required
          value={values.label}
          onChange={(v) => setField("label", v)}
          onBlur={() => handleBlur("label")}
          error={showError("label") ? errors.label : undefined}
        />
        <TextField
          label="Recipient Name"
          placeholder="John Doe"
          required
          value={values.fullName}
          onChange={(v) => setField("fullName", v)}
          onBlur={() => handleBlur("fullName")}
          error={showError("fullName") ? errors.fullName : undefined}
        />
        <TextField
          label="Phone Number"
          placeholder="080 3123 4567"
          type="tel"
          required
          value={values.phone}
          onChange={(v) => setField("phone", v)}
          onBlur={() => handleBlur("phone")}
          error={showError("phone") ? errors.phone : undefined}
        />
        <TextField
          label="ZIP / Postal Code"
          placeholder="100271"
          required
          value={values.zipCode}
          onChange={(v) => setField("zipCode", v)}
          onBlur={() => handleBlur("zipCode")}
          error={showError("zipCode") ? errors.zipCode : undefined}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Street Address"
            placeholder="14 Awolowo Road, Allen Avenue"
            required
            value={values.street}
            onChange={(v) => setField("street", v)}
            onBlur={() => handleBlur("street")}
            error={showError("street") ? errors.street : undefined}
          />
        </div>
        <SelectField
          label="State"
          required
          value={values.state}
          onChange={handleStateChange}
          onBlur={() => handleBlur("state")}
          error={showError("state") ? errors.state : undefined}
          options={states}
          placeholder="Select state"
        />
        <SelectField
          label="City / LGA"
          required
          value={values.lga}
          onChange={(v) => setField("lga", v)}
          onBlur={() => handleBlur("lga")}
          error={showError("lga") ? errors.lga : undefined}
          options={lgaOptions}
          disabled={!values.state}
          loading={lgasFetching}
          placeholder={values.state ? "Select LGA" : "Select a state first"}
        />
        <TextField
          label="Country"
          placeholder="Nigeria"
          required
          value={values.country}
          onChange={(v) => setField("country", v)}
          onBlur={() => handleBlur("country")}
          error={showError("country") ? errors.country : undefined}
        />
      </div>

      {showDefaultToggle && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(values.isDefault)}
            onChange={(e) => setField("isDefault", e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 text-brand bg-[#292B30] focus:ring-red-500"
          />
          <span className="text-sm text-gray-300">Set as default address</span>
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover disabled:bg-gray-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
        >
          {isSaving ? (
            <>
              <LoadingSpinner />
              Saving…
            </>
          ) : (
            <>
              <HiCheckCircle className="w-4 h-4" />
              {submitLabel}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 rounded-xl bg-[#292B30] hover:bg-[#3A3A3C] text-white text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// ── Fields ────────────────────────────────────────────────────────────
const inputClass = (hasError?: boolean) =>
  `w-full bg-[#1a1c20] text-white px-3 py-2.5 rounded-xl border ${
    hasError ? "border-red-500" : "border-[#3A3A3C] focus:border-red-500"
  } focus:outline-none text-sm placeholder-gray-600 transition-colors`;

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-400 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function TextField({
  label,
  placeholder,
  type = "text",
  required,
  value,
  onChange,
  onBlur,
  error,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={inputClass(Boolean(error))}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  required,
  value,
  onChange,
  onBlur,
  error,
  options,
  placeholder,
  disabled,
  loading,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled || loading}
        aria-invalid={Boolean(error)}
        className={`${inputClass(Boolean(error))} appearance-none cursor-pointer ${
          value ? "text-white" : "text-gray-600"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <option value="" disabled>
          {loading ? "Loading…" : placeholder ?? "Select…"}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt} className="text-white bg-[#1a1c20]">
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default AddressForm;
