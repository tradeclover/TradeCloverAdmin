import Head from 'next/head';
import AdminLayout from '@/layout/AdminLayout';
import LineChartOne from "@/components/charts/line/LineChartOne";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import React from "react";

export default function LineChart() {
  return (
    <AdminLayout>
      <Head>
        <title>Next.js Line Chart | TailAdmin - Next.js Dashboard Template</title>
        <meta name="description" content="This is Next.js Line Chart page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template" />
      </Head>
      <div>
        <PageBreadcrumb pageTitle="Line Chart" />
        <div className="space-y-6">
          <ComponentCard title="Line Chart 1">
            <LineChartOne />
          </ComponentCard>
        </div>
      </div>
    </AdminLayout>
  );
}
