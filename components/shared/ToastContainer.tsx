"use client"

import { useDataSource } from "@/lib/data-provider"

const bgMap = {
  info: "bg-blue-950/90 border-blue-800 text-blue-300",
  warning: "bg-yellow-950/90 border-yellow-800 text-yellow-300",
  error: "bg-red-950/90 border-red-800 text-red-300",
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useDataSource()
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`p-3 rounded-lg border text-sm animate-fade-in
                      flex items-start justify-between gap-2 ${bgMap[toast.type]}`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-gray-500 hover:text-white shrink-0"
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}
