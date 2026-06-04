import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ConnectionStatusBadge from '../ui/ConnectionStatusBadge';

describe('ConnectionStatusBadge', () => {
  it('renders live label when open and fresh', () => {
    render(<ConnectionStatusBadge status="open" lastTickAgeMs={1000} />);
    expect(screen.getByText(/iss · live/i)).toBeInTheDocument();
  });

  it('renders connecting label when status is connecting', () => {
    render(<ConnectionStatusBadge status="connecting" lastTickAgeMs={null} />);
    expect(screen.getByText(/iss · connecting/i)).toBeInTheDocument();
  });

  it('renders reconnecting label when status is reconnecting', () => {
    render(<ConnectionStatusBadge status="reconnecting" lastTickAgeMs={1000} />);
    expect(screen.getByText(/iss · reconnecting/i)).toBeInTheDocument();
  });

  it('renders offline label when status is closed', () => {
    render(<ConnectionStatusBadge status="closed" lastTickAgeMs={null} />);
    expect(screen.getByText(/iss · offline/i)).toBeInTheDocument();
  });

  it('falls back to stale label when open but last tick is >30s old', () => {
    render(<ConnectionStatusBadge status="open" lastTickAgeMs={45_000} />);
    expect(screen.getByText(/iss · stale/i)).toBeInTheDocument();
  });

  it('shows offline label when reconnecting and last tick stale', () => {
    render(<ConnectionStatusBadge status="reconnecting" lastTickAgeMs={45_000} />);
    expect(screen.getByText(/iss · offline/i)).toBeInTheDocument();
  });

  it('has an aria-label that mentions the last frame age', () => {
    render(<ConnectionStatusBadge status="open" lastTickAgeMs={2_000} />);
    const node = screen.getByLabelText(/Live stream live, last frame 2s ago/i);
    expect(node).toBeInTheDocument();
  });

  it('says "awaiting first frame" when no tick has arrived', () => {
    render(<ConnectionStatusBadge status="connecting" lastTickAgeMs={null} />);
    const node = screen.getByLabelText(/awaiting first frame/i);
    expect(node).toBeInTheDocument();
  });
});
