import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Still visible in the browser console for debugging.
    console.error('Patchdeck crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '32px',
            background: '#17140f',
            color: '#f1e9da',
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '16px', fontWeight: 600 }}>Something broke in Patchdeck.</p>
          <p style={{ fontSize: '13px', color: '#9c917e', maxWidth: '360px' }}>
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#e8a33d',
              color: '#1a1409',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
