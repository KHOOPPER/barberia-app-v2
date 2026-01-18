/**
 * @fileoverview Error Boundary para capturar errores de React
 * @module components/ErrorBoundary
 */

import React from "react";

/**
 * Componente ErrorBoundary para capturar errores de React
 * Muestra un mensaje amigable cuando ocurre un error
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para mostrar el UI de error
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log del error a un servicio de logging
    console.error("Error capturado por ErrorBoundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      // UI personalizada de error
      return (
        <div className="min-h-screen flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center border border-white/20">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Algo salió mal
            </h1>
            <p className="text-white/80 mb-6">
              Ocurrió un error inesperado. Por favor, recarga la página o
              contacta al soporte si el problema persiste.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-white/60 mb-2">
                  Detalles del error (solo en desarrollo)
                </summary>
                <pre className="text-xs text-white/40 bg-black/40 p-4 rounded-lg overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;








