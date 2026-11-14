// Owner: Breno. If the 3D scene crashes (no WebGL, weak GPU, bad model file),
// hide it and keep the 2D UI working instead of a blank page.
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export class SceneErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[scene] disabled after error:', error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
