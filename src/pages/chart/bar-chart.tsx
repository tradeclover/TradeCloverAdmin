import Head from 'next/head';
import AdminLayout from '@/layout/AdminLayout';
import BarChartOne from "@/components/charts/bar/BarChartOne";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React from "react";

export default function page() {
  return (
    <AdminLayout>
      <Head>
        <title>Next.js Bar Chart | TailAdmin - Next.js Dashboard Template</title>
        <meta name="description" content="This is Next.js Bar Chart page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template" />
      </Head>
      <div>
        <PageBreadcrumb pageTitle="Bar Chart" />
        <div className="space-y-6">
          <ComponentCard title="Bar Chart 1">
            <BarChartOne />
          </ComponentCard>
        </div>
      </div>
    </AdminLayout>
  );
}
