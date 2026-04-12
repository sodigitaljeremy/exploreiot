"use client"

import { useState, useRef, useEffect } from "react"
import { GLOSSARY } from "@/lib/glossary"

export default function Term({ id, children }: { id: string; children?: React.ReactNode }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const entry = GLOSSARY[id]

  // Close on click outside
  useEffect(() => {
    if (!show) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [show])

  if (!entry) {
    return <span>{children ?? id}</span>
  }

  return (
    <span ref={ref} className="relative inline-block">
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="border-b border-dotted border-gray-500 cursor-help"
      >
        {children ?? entry.term}
      </span>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64
                         bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl
                         text-xs text-gray-300 leading-relaxed animate-fade-in">
          <span className="font-bold text-white block mb-1">{entry.term}</span>
          {entry.shortDef}
          {entry.docLink && (
            <a
              href={entry.docLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              En savoir plus →
            </a>
          )}
          {entry.relatedTerms && entry.relatedTerms.length > 0 && (
            <span className="block mt-1 text-gray-500">
              Voir aussi : {entry.relatedTerms.join(", ")}
            </span>
          )}
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
                           border-4 border-transparent border-t-gray-700" />
        </span>
      )}
    </span>
  )
}
