import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error in Component Tree:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            padding: 20,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px',
              }}
            >
              <AlertCircle size={24} />
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f172a' }}>
              Something went wrong
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
              The application encountered a display error. Your sales and inventory data remain safe in local storage.
            </p>

            {this.state.error?.message && (
              <pre
                style={{
                  background: '#f1f5f9',
                  padding: '10px 12px',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  color: '#b91c1c',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: 16,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.message}
              </pre>
            )}

            <button
              type="button"
              onClick={this.handleReload}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#3b6998',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 18px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={16} /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
