import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft, Check, AlertTriangle } from 'lucide-react';
import axios from 'axios';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setIsValid(false);
      return;
    }

    const validateToken = async () => {
      try {
        await axios.get(`/api/auth/verify-reset-token/${token}`);
        setIsValid(true);
      } catch {
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await axios.post('/api/auth/reset-password', {
        token,
        new_password: password,
      });
      setIsSuccess(true);
    } catch {
      setError('Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="loading-container">
            <div className="spinner" />
            <p>Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isValid || !token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="error-icon">
              <AlertTriangle size={32} />
            </div>
            <h1>Invalid or Expired Link</h1>
            <p>This password reset link is invalid or has expired. Please request a new one.</p>
          </div>
          <Link to="/forgot-password" className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>
            Request New Link
          </Link>
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

  if (isSuccess) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="success-icon">
              <Check size={32} />
            </div>
            <h1>Password Reset!</h1>
            <p>Your password has been successfully reset. You can now log in with your new password.</p>
          </div>
          <button
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <Lock size={32} className="login-icon" />
          <h1>Reset Password</h1>
          <p>Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              autoFocus
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !password || !confirmPassword}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
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
