import Head from 'next/head';
import AuthLayout from '@/layout/AuthLayout';
import SignUpForm from "@/components/auth/SignUpForm";

export default function SignUp() {
  return (
    <AuthLayout>
      <Head>
        <title>Next.js SignUp Page | TailAdmin - Next.js Dashboard Template</title>
        <meta name="description" content="This is Next.js SignUp Page TailAdmin Dashboard Template" />
      </Head>
      <SignUpForm />
    </AuthLayout>
  );
}
