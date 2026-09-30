import { useNavigate } from "react-router-dom";

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="mx-auto max-w-sm text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-10 w-10 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Text */}
        <h1 className="text-2xl font-bold text-white-900">Coming Soon</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          We're putting the finishing touches on this feature. It will be ready
          very soon. check back shortly!
        </p>

        {/* CTA */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => navigate("/")}
            className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white transition-colors hover:bg-brand-hover active:scale-[0.98]"
          >
            Browse Products
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
