import { Component } from 'react';
import { Link } from 'react-router-dom';

/**
 * Keeps a render error in one page from blanking the whole site.
 *
 * Without this, an unexpected shape in CMS content takes down the header,
 * footer and navigation too, leaving the visitor on a white screen with no way
 * out. Here they still get the chrome and a link home.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page render failed:', error, info);
  }

  componentDidUpdate(prevProps) {
    // A new route is a fresh chance to render; without this the error state
    // would persist and every subsequent page would show the fallback.
    if (prevProps.routeKey !== this.props.routeKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <section className="section">
        <div className="shell">
          <span className="eyebrow">Something went wrong</span>
          <h1 className="t-h2 balance">This page could not be displayed</h1>
          <p className="lead t-lead pretty">
            Please try again, or head back to the homepage.
          </p>
          <Link className="btn btn-accent" to="/">Back to home</Link>
        </div>
      </section>
    );
  }
}
