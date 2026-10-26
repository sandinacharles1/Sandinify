// *********************************************
// *                                           *
// *     DYNAMIC JAVASCRIPT REACT FRONTEND     *
// *                                           *
// *                                           *
// *********************************************
// 1. IMPORT STATEMENTS: Bring in tools from React library. Syntax: import { toolName } from 'libraryName'; 'useState' is used to store & update data.
import React, { useState } from 'react';

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
      const response = await fetch(`http://localhost:8080${endpoint}`, {
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

  async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  const res = await fetch('http://localhost:8080/api/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  if (!res.ok) return false;

  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  return true;
}

// Use this instead of fetch for any endpoint that needs login.
async function authFetch(url, options = {}) {
  const send = () => fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
    }
  });

  let res = await send();
  if (res.status === 401 && await refreshAccessToken()) {
    res = await send();   // retry with the new access token
  }
  return res;
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
          <h1 style={styles.title}> ❁ Welcome ❁</h1>
          <p style={styles.subtitle}>Create an account or log in to continue</p>
        </div>

        <div style={styles.formGrid}>
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

          <div style={styles.divider}></div>

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
  //Code for ENTIRE Page
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(181, 201, 154, 0.95)',
    padding: '20px'
  },

  //STYLE FOR CARD ONLY
  authCard: {
    width: '100%',
    maxWidth: '920px',
    background: 'rgba(255, 192, 203, 0.68)',
    border: '4px solid rgba(114, 86, 114, 0.2)',
    borderRadius: '20px',
    padding: '32px',
  },

  //STYLE FOR HEADER (under music APP)
  header: {
    fontFamily: 'Garamond, serif',
    textAlign: 'center',
    color: 'rgb(56, 80, 17)',
    marginBottom: '28px'
  },
  //STYLE FOR TITLE
  title: {
    fontFamily: 'Garamond, serif',
    margin: 0,
    fontSize: '2.2rem',
    fontWeight: '300'
  },

  //HOW ELEMENTS ARE SPACED OUT
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr', //turn into columns with a divider in the middle
    gap: '20px',
    alignItems: 'center'
  },

  feedback: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '20px',
    padding: '12px 16px',
    border: '2px solid',
    borderRadius: '12px',
    fontFamily: 'Garamond, serif',
    fontSize: '1rem',
  },
  successFeedback: {
    background: 'rgba(202, 225, 178, 0.8)',
    borderColor: 'rgba(56, 80, 17, 0.45)',
    color: 'rgb(48, 69, 20)',
  },
  errorFeedback: {
    background: 'rgba(255, 225, 228, 0.9)',
    borderColor: 'rgba(132, 55, 66, 0.45)',
    color: 'rgb(112, 38, 50)',
  },
  loadingFeedback: {
    background: 'rgba(255, 242, 198, 0.85)',
    borderColor: 'rgba(114, 86, 45, 0.4)',
    color: 'rgb(91, 69, 30)',
  },
  feedbackCode: {
    flexShrink: 0,
  },
  
  //INDIVIDUAL CARD STYLE (SIGNUP & LOGIN)
  formCard: {
    display: 'flex',
    flexDirection: 'column', //stack elements vertically
    
    background: 'rgba(202, 225, 178, 0.6)',
    border: '4px solid rgba(181, 201, 154, 0.2)',
    borderRadius: '16px',
    padding: '24px',
    boxSizing: 'border-box',
    
  },
  //H2, SIGNUP AND LOGIN
  formTitle: {
    color: 'rgb(48, 69, 20)',
    margin: '0 0 18px',
    fontSize: '1.5rem',
  },
  //USERNAME/PASWORD
  label: {
    
    marginBottom: '8px',
    fontSize: '0.92rem',
    fontWeight: '600',
    color: 'rgb(48, 69, 20)'
  },
  //INPUT BOXES FOR USERNAME/PASSWORD
  input: {
    fontFamily: 'inherit', //from parent class
    marginBottom: '18px',
    padding: '12px 14px',
    border: '1px solid #475569',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.5)',
    color: 'rgb(48,59,20)',
    fontSize: '1rem',
    outline: 'none'
  },
  //SUBMIT BUTTON
  enterButton: {
    marginTop: '8px',
    padding: '12px 18px',
    border: '1px solid rgba(48,59,20)',
    borderRadius: '10px',
    background:'rgba(255, 192, 203, 0.9)',
    color: 'rgb(48,59,20)',
    fontSize: '1rem',
    fontWeight: '700',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },

  divider: {
    position: 'relative',
    width: '1px',
    minHeight: '100%',
    background: 'rgba(48, 69, 20, 0.3)',
    margin: '0 8px'
  },

};
    
