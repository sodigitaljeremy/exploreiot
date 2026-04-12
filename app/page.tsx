// app/page.tsx
"use client"

import dynamic from "next/dynamic"
import { DataSourceProvider } from "@/lib/data-provider"

const AppClient = dynamic(() => import("@/components/app-client"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-500 font-mono text-sm animate-pulse">
        Chargement ExploreIOT...
      </div>
    </div>
  ),
})

export default function Page() {
  return (
    <DataSourceProvider>
      <AppClient />
    </DataSourceProvider>
  )
}
