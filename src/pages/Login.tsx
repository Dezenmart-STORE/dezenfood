import { BRAND } from "../config/brand";
import { useState } from "react";
import { Link } from "react-router-dom";
import { googleIcon, Logo } from ".";
import Button from "../components/common/Button";
import { useAuth } from "../context/AuthContext";

interface LoginProps {
  isFromReferral?: boolean;
}

const Login: React.FC<LoginProps> = ({ isFromReferral = false }) => {
  const pageTitle = isFromReferral ? "Create an account" : "Log in or sign up";
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { login } = useAuth();

  // const [email, setEmail] = useState("");
  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState("");

  // const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setEmail(e.target.value);
  //   if (error) setError("");
  // };

  // const handleEmailLogin = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!email.trim()) {
  //     setError("Please enter your email");
  //     return;
  //   }
  //   if (!/\S+@\S+\.\S+/.test(email)) {
  //     setError("Please enter a valid email address");
  //     return;
  //   }
  //   setIsLoading(true);
  //   setTimeout(() => {
  //     setIsLoading(false);
  //     setError("Email login not implemented yet");
  //   }, 1500);
  // };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    login("google");
  };

  return (
    <div className="bg-Dark flex justify-center items-center py-10 min-h-screen">
      <div className="flex flex-col items-center w-full max-w-md px-6 md:px-10">

        {/* Logo */}
        <img
          src={Logo}
          alt={`${BRAND.name} Logo`}
          className="w-[75px] h-[75px] mb-8"
        />

        {/* Heading */}
        <div className="text-center mb-8">
          {isFromReferral && (
            <p className="text-Red font-semibold text-sm uppercase tracking-widest mb-2">
              You've been invited!
            </p>
          )}
          <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
          {isFromReferral && (
            <p className="text-gray-400 mt-2 text-sm">
              Sign up to receive points on your first purchase
            </p>
          )}
        </div>

        {/* Google Login */}
        <div className="w-full space-y-4">
          <Button
            title={isGoogleLoading ? "Redirecting to Google..." : "Continue with Google"}
            img={googleIcon}
            path=""
            className="bg-white flex justify-center gap-3 text-gray-900 font-semibold h-12 rounded-md w-full border-none hover:bg-gray-100 transition-colors"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          />
        </div>

        {/* Commented out: Email login form */}
        {/* <form onSubmit={handleEmailLogin} className="w-full">
          <input
            type="email"
            className={`text-white bg-[#292B30] h-12 w-full border-none outline-none px-4 mb-2 ${
              error ? "border-l-4 border-l-Red" : ""
            }`}
            placeholder="Enter your email"
            value={email}
            onChange={handleEmailChange}
          />
          {error && <p className="text-Red text-sm mb-3 mt-1">{error}</p>}
          <Button
            title={isLoading ? "Please wait..." : "Continue"}
            type="submit"
            className="bg-Red text-white h-12 flex justify-center w-full border-none outline-none text-center mb-5"
            disabled={isLoading}
          />
        </form> */}

        {/* Commented out: Facebook login */}
        {/* <Button
          title="Sign in with Facebook"
          img={facebookIcon}
          className="bg-[#292B30] flex justify-center gap-2 text-white h-12 rounded-md w-full border-none"
          onClick={() => handleSocialLogin("facebook")}
        /> */}

        {/* Commented out: X (Twitter) login */}
        {/* <Button
          title="Sign in with X"
          img={xIcon}
          className="bg-[#292B30] flex justify-center gap-2 text-white h-12 rounded-md w-full border-none"
          onClick={() => handleSocialLogin("x")}
        /> */}

        {/* Commented out: Wallet connect */}
        {/* <Button
          title="Connect with a wallet"
          onClick={() => setShowConnectWallet(true)}
          className="bg-[#292B30] text-white h-12 flex justify-center w-full border-none outline-none text-center"
        /> */}

        {/* Terms */}
        <p className="text-sm text-center font-medium text-gray-400 mt-8">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="text-[#4FA3FF] hover:underline">
            Terms of Service
          </Link>
          ,{" "}
          <Link to="/privacy" className="text-[#4FA3FF] hover:underline">
            Privacy Policy
          </Link>{" "}
          &{" "}
          <Link to="/cookies" className="text-[#4FA3FF] hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Login;
