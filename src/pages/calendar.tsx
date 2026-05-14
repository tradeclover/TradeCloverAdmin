import Head from 'next/head';
import AdminLayout from '@/layout/AdminLayout';
import Calendar from "@/components/calendar/Calendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React from "react";

export default function page() {
  return (
    <AdminLayout>
      <Head>
        <title>Next.js Calendar | TailAdmin - Next.js Dashboard Template</title>
        <meta name="description" content="This is Next.js Calendar page for TailAdmin  Tailwind CSS Admin Dashboard Template" />
      </Head>
      <div>
        <PageBreadcrumb pageTitle="Calendar" />
        <Calendar />
      </div>
    </AdminLayout>
  );
}
