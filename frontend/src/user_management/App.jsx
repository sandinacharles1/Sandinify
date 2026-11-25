// *********************************************
// *                                           *
// *     DYNAMIC JAVASCRIPT REACT FRONTEND     *
// *                                           *
// *                                           *
// *********************************************
// 1. IMPORT STATEMENTS: Bring in tools from React library. Syntax: import { toolName } from 'libraryName'; 'useState' is used to store & update data.
import React, { useState } from 'react';
import { API_BASE_URL } from './authApi';
import './AuthForms.css';
import { colors as homeColors, styles as homeStyles } from '../song_upload/home_page/Styles';

export default function AuthForms({ onAuthenticated }) {
  // 2. STATE DEFINITIONS: Storing input values in browser memory. Syntax: const [varName, setterFunc] = useState(initialValue);
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 3. FUNCTION FOR SIGNUP SUBMISSION. 'async' because we need to wait for the server response.
  const handleSignup = async (event) => {
    event.preventDefault(); // Prevent the default browser behavior (reloading the whole webpage when a form submits).

    await submitAuthRequest('/api/signup', signupUsername, signupPassword);
  };

  // 6. FUNCTION FOR LOGIN SUBMISSION
  const handleLogin = async (event) => {
    event.preventDefault();

    await submitAuthRequest('/api/login', loginUsername, loginPassword);
  };

  async function submitAuthRequest(endpoint, username, password) {
    setIsSubmitting(true);
    setFeedback({ type: 'loading', code: null, message: 'Connecting to the server…' });

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      let result = {};
      try {
        const body = await response.json();
        if (body && typeof body === 'object') result = body;
      } catch {
        // Use the HTTP status below when the server did not return JSON.
      }

      if (response.ok) {
        try {
          localStorage.setItem('accessToken', result.accessToken);
          localStorage.setItem('refreshToken', result.refreshToken);
          localStorage.setItem('username', username);
        } catch {
          setFeedback({
            type: 'error',
            code: 'Session storage error',
            message: 'The server accepted the request, but this browser could not save your session.'
          });
          return;
        }
        setFeedback({
          type: 'success',
          code: `HTTP ${response.status}`,
          message: result.message || 'Request completed successfully.'
        });
        onAuthenticated(username);
        return;
      }

      const statusMessages = {
        400: 'Please check the information you entered.',
        401: 'Invalid username or password.',
        409: 'That username is already taken.',
        429: 'Too many attempts. Please wait a moment and try again.'
      };
      const message = result.message || statusMessages[response.status]
        || (response.status >= 500
          ? 'The server encountered an error. Please try again later.'
          : 'The request could not be completed.');

      setFeedback({
        type: 'error',
        code: `HTTP ${response.status}`,
        message
      });
    } catch {
      setFeedback({
        type: 'error',
        code: 'Network error',
        message: 'Could not reach the server. Check that it is running and that this page is allowed to connect to it.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // *******************************************************************
 // *                                                                 *
 // *     JSX RENDER (UI BOXES THE USER SEES) (HTML).
 // *                                                                 *
 // *******************************************************************
  return (
    <div style={styles.page}>
      <div style={styles.authCard}>
        
        <div style={styles.header}>
          <h1 style={styles.title}>Sandinify</h1>
          <p style={styles.subtitle}>Create an account or log in to continue</p>
        </div>

        <div className="auth-form-grid" style={styles.formGrid}>
          <form onSubmit={handleSignup} style={styles.formCard}>
            <h2 style={styles.formTitle}>Sign Up</h2>
            <label htmlFor="signupUsername" style={styles.label}>Username</label>
            <input
              id="signupUsername"
              type="text"
              value={signupUsername}
              onChange={(e) => setSignupUsername(e.target.value)}
              placeholder="Choose a username"
              style={styles.input}
            />

            <label htmlFor="signupPassword" style={styles.label}>Password</label>
            <input
              id="signupPassword"
              type="password"
              value={signupPassword}
              onChange={(e) => setSignupPassword(e.target.value)}
              placeholder="Create a password"
              style={styles.input}
            />

            <button type="submit" style={styles.enterButton} disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : 'Create Account'}
            </button>
          </form>

          <div className="auth-form-divider" style={styles.divider}></div>

          <form onSubmit={handleLogin} style={styles.formCard}>
            <h2 style={styles.formTitle}>Log In</h2>

            <label htmlFor="loginUsername" style={styles.label}>Username</label>
            <input
              id="loginUsername"
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              placeholder="Enter your username"
              style={styles.input}
            />

            <label htmlFor="loginPassword" style={styles.label}>Password</label>
            <input
              id="loginPassword"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Enter your password"
              style={styles.input}
            />

            <button type="submit" style={styles.enterButton} disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : 'Log In'}
            </button>
          </form>
        </div>

        {feedback && (
          <div
            role={feedback.type === 'error' ? 'alert' : 'status'}
            aria-live="polite"
            style={{ ...styles.feedback, ...styles[`${feedback.type}Feedback`] }}
          >
            {feedback.code && <strong style={styles.feedbackCode}>{feedback.code}</strong>}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    ...homeStyles.page,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  authCard: {
    ...homeStyles.wrapper,
    width: '100%',
    maxWidth: '920px',
    boxSizing: 'border-box',
  },
  header: {
    ...homeStyles.banner,
    height: 'auto',
    minHeight: '120px',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: '4px',
    padding: '20px 28px',
    textAlign: 'center',
    color: '#ffffff',
  },
  title: {
    margin: 0,
    fontSize: '2.5rem',
    fontWeight: '400',
    fontStyle: 'italic',
    color: '#ffffff',
    textShadow: `2px 2px 0 ${homeColors.pinkDeep}, 0 0 14px rgba(222,120,150,0.8)`,
    letterSpacing: '1px',
  },
  subtitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#ffffff',
    textShadow: `1px 1px 0 ${homeColors.pinkDeep}`,
  },
  formGrid: {
    display: 'grid',
    gap: '20px',
    alignItems: 'stretch',
    padding: '24px',
    boxSizing: 'border-box',
  },
  feedback: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '0 24px 24px',
    padding: '12px 16px',
    border: '2px solid',
    borderRadius: '12px',
    fontFamily: 'Garamond, serif',
    fontSize: '1rem',
  },
  successFeedback: {
    background: homeColors.softGreen,
    borderColor: homeColors.darkGreen,
    color: homeColors.darkGreen,
  },
  errorFeedback: {
    background: homeColors.pinkLight,
    borderColor: 'rgba(132, 55, 66, 0.45)',
    color: 'rgb(112, 38, 50)',
  },
  loadingFeedback: {
    background: 'rgba(255, 242, 198, 0.85)',
    borderColor: homeColors.line,
    color: 'rgb(91, 69, 30)',
  },
  feedbackCode: {
    flexShrink: 0,
  },
  formCard: {
    display: 'flex',
    flexDirection: 'column',
    background: homeColors.pinkCream,
    border: `2px solid ${homeColors.line}`,
    borderRadius: '16px',
    boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.7), 0 3px 8px rgba(114,86,114,0.18)',
    padding: '24px',
    boxSizing: 'border-box',
  },
  formTitle: {
    ...homeStyles.sectionBand,
    margin: '0 0 18px',
  },
  label: {
    marginBottom: '8px',
    fontSize: '0.92rem',
    fontWeight: '600',
    color: homeColors.darkGreen,
  },
  input: {
    fontFamily: 'inherit',
    marginBottom: '18px',
    padding: '10px 12px',
    border: `1px solid ${homeColors.line}`,
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.85)',
    color: homeColors.darkGreen,
    fontSize: '1rem',
  },
  enterButton: {
    marginTop: '8px',
    padding: '10px 16px',
    border: `2px solid ${homeColors.pinkDeep}`,
    borderRadius: '12px',
    background: 'linear-gradient(#ffffff, #ffe3ea)',
    color: homeColors.link,
    fontSize: '0.95rem',
    fontWeight: '700',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  divider: {
    position: 'relative',
    background: homeColors.line,
  },
};
