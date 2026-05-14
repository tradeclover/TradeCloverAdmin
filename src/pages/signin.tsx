import Head from 'next/head';
import AuthLayout from '@/layout/AuthLayout';
import SignInForm from "@/components/auth/SignInForm";

export default function SignIn() {
  return (
    <AuthLayout>
      <Head>
        <title>Trade Clover Admin Sign In</title>
        <meta name="description" content="Sign in to Trade Clover Admin with phone OTP" />
      </Head>
      <SignInForm />
    </AuthLayout>
  );
}
