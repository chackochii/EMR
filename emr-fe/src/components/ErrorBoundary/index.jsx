import { Component } from 'react';
import Button from '../Button';

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="state state--error" role="alert">
        <h2 className="state__title">Something went wrong</h2>
        <p className="state__text">An unexpected error occurred while rendering this page.</p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </div>
    );
  }
}
