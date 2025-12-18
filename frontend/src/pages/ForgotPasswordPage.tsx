import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import axios from 'axios';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await axios.post('/api/auth/forgot-password', { email });
      setIsSubmitted(true);
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="success-icon">
              <Check size={32} />
            </div>
            <h1>Check Your Email</h1>
            <p>If an account exists for {email}, you will receive a password reset link shortly.</p>
          </div>
          <Link to="/login" className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Mail size={32} className="login-icon" />
          <h1>Forgot Password</h1>
          <p>Enter your email and we'll send you a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoFocus
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading || !email}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/login">
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
