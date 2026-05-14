"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon } from "@/icons";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { apiPost } from "@/utils/api";

export default function SignInForm() {
  const DEFAULT_COUNTRY_CODE = "+91";
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const parsePhoneInput = (rawPhone: string) => {
    const cleaned = rawPhone.trim().replace(/[\s-]/g, "");
    const isInternational = cleaned.startsWith("+");
    const digits = cleaned.replace(/\D/g, "");

    if (!digits) {
      return { countryCode: DEFAULT_COUNTRY_CODE, phone: "" };
    }

    if (isInternational && digits.length > 10) {
      return {
        countryCode: `+${digits.slice(0, digits.length - 10)}`,
        phone: digits.slice(-10),
      };
    }

    if (!isInternational && digits.length > 10) {
      return {
        countryCode: `+${digits.slice(0, digits.length - 10)}`,
        phone: digits.slice(-10),
      };
    }

    return { countryCode: DEFAULT_COUNTRY_CODE, phone: digits };
  };

  const sendOtp = async (phoneInput: string) => {
    const { countryCode, phone } = parsePhoneInput(phoneInput);
    await apiPost("/users/send-admin-otp/", {
      phone,
      country_code: countryCode,
    });
  };

  const verifyOtp = async (phoneInput: string, code: string) => {
    const { countryCode, phone } = parsePhoneInput(phoneInput);
    return await apiPost("/users/verify-admin-otp/", {
      phone,
      country_code: countryCode,
      otp_code: code,
    });
  };

  const getErrorMessage = (err: any, fallback: string) => {
    const data = err?.response?.data;
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.message === "string") return data.message;
    return fallback;
  };

  const normalizePhone = (value: string) => value.trim();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      setError("Please enter phone number.");
      return;
    }

    setLoading(true);
    try {
      await sendOtp(normalizedPhone);
      setOtpSent(true);
      setSuccessMessage("OTP sent successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send OTP."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone || !otp.trim()) {
      setError("Please enter phone number and OTP.");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOtp(normalizedPhone, otp.trim());
      const data = response?.data || {};

      const accessToken =
        data.access ||
        data.access_token ||
        data.token ||
        data?.tokens?.access ||
        null;
      const refreshToken =
        data.refresh || data.refresh_token || data?.tokens?.refresh || null;

      if (accessToken) {
        localStorage.setItem("access_token", accessToken);
        localStorage.setItem("admin_token", accessToken);
      }
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }

      if (!accessToken) {
        setError("OTP verified, but no access token received.");
        return;
      }

      router.replace("/");
    } catch (err) {
      setError(getErrorMessage(err, "Invalid OTP. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setSuccessMessage("");

    const normalizedPhone = normalizePhone(phoneNumber);
    if (!normalizedPhone) {
      setError("Please enter phone number.");
      return;
    }

    setLoading(true);
    try {
      await sendOtp(normalizedPhone);
      setSuccessMessage("OTP sent successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to resend OTP."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          Admin sign in
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter phone number to receive OTP.
            </p>
          </div>
          <div>
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}>
              <div className="space-y-6">
                <div>
                  <Label>
                    Phone Number <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    placeholder="+91XXXXXXXXXX"
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                {otpSent && (
                  <div>
                    <Label>
                      OTP <span className="text-error-500">*</span>
                    </Label>
                    <Input
                      placeholder="Enter OTP"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                )}
                {error && <p className="text-sm text-error-500">{error}</p>}
                {successMessage && (
                  <p className="text-sm text-success-600">{successMessage}</p>
                )}
                <div>
                  <Button className="w-full" size="sm" disabled={loading}>
                    {loading
                      ? "Please wait..."
                      : otpSent
                      ? "Verify OTP & Sign In"
                      : "Send OTP"}
                  </Button>
                </div>
                {otpSent && (
                  <button
                    type="button"
                    className="w-full text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                    onClick={handleResendOtp}
                    disabled={loading}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
