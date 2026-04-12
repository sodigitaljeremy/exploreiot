"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

/** Catches render errors in children and displays a fallback. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error("Component error:", error)
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="bg-red-950/30 border border-red-900 rounded-lg p-4 text-red-400 text-sm">
            Une erreur est survenue dans ce composant.
            <button
              onClick={this.handleReset}
              className="mt-2 px-3 py-1 bg-red-900/50 hover:bg-red-900 rounded text-xs transition-colors block"
            >
              Reessayer
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
