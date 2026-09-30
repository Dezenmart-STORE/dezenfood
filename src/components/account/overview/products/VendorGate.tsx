import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useGetMyVendorQuery } from "../../../../store/api";
import LoadingSpinner from "../../../common/LoadingSpinner";

/**
 * Only approved vendors can list food. Everyone else sees where they are in the
 * process. (The backend enforces this too - this is just the friendly version.)
 */
export default function VendorGate({ children }: { children: ReactNode }) {
  const { data: vendor, isLoading, isError, error } = useGetMyVendorQuery();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const notFound = isError && (error as { status?: number })?.status === 404;
  if (isError && !notFound) {
    return <p className="py-10 text-center text-sm text-red-400" role="alert">We couldn't check your vendor status. Please try again.</p>;
  }

  if (!vendor || notFound) {
    return (
      <Notice
        emoji="👩‍🍳"
        title="Sell on DezenFoods"
        body="Apply to become a vendor. Tell us what you cook or sell, where you're based and where to pay you. We review every application."
        cta={{ to: "/vendor/apply", label: "Apply to sell" }}
      />
    );
  }
  if (vendor.status === "pending") {
    return <Notice emoji="⏳" title="Application under review" body="We're reviewing your application. You'll be notified as soon as you can start listing." />;
  }
  if (vendor.status === "rejected") {
    return (
      <Notice
        emoji="✋"
        title="Application not approved"
        body={vendor.rejectionReason || "Your application wasn't approved. You can update your details and apply again."}
        cta={{ to: "/vendor/apply", label: "Update & reapply" }}
      />
    );
  }
  if (vendor.status === "suspended") {
    return <Notice emoji="⛔" title="Vendor account suspended" body="Your vendor account is suspended. Contact support to find out why." />;
  }
  return <>{children}</>;
}

function Notice({ emoji, title, body, cta }: { emoji: string; title: string; body: string; cta?: { to: string; label: string } }) {
  return (
    <div className="mx-auto max-w-sm py-12 text-center">
      <div className="text-4xl">{emoji}</div>
      <h3 className="mt-3 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-400">{body}</p>
      {cta && (
        <Link to={cta.to} className="mt-5 inline-block rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-hover">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
