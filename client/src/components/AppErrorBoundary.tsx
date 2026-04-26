import { Component, ErrorInfo, ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Intencionalmente silencioso para evitar vazamento de detalhes em producao.
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <main className="app-error-boundary" role="alert" aria-live="assertive">
          <div className="app-error-boundary__card">
            <h1>Algo saiu do esperado</h1>
            <p>
              Ocorreu um erro inesperado na interface. Voce pode recarregar a pagina para continuar.
            </p>
            <button type="button" className="btn-primary" onClick={this.handleReload}>
              Recarregar pagina
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
