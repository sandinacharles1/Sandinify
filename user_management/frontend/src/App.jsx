// *********************************************
// *                                           *
// *     DYNAMIC JAVASCRIPT REACT FRONTEND     *
// *                                           *
// *                                           *
// *********************************************
// 1. IMPORT STATEMENTS: Bring in tools from React library. Syntax: import { toolName } from 'libraryName'; 'useState' is used to store & update data.
import React, { useState } from 'react';

export default function AuthForms() {
  // 2. STATE DEFINITIONS: Storing input values in browser memory. Syntax: const [varName, setterFunc] = useState(initialValue);
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 3. FUNCTION FOR SIGNUP SUBMISSION. 'async' because we need to wait for the server response.
  const handleSignup = async (event) => {
    event.preventDefault(); // Prevent the default browser behavior (reloading the whole webpage when a form submits).

    // 4. FETCH API (HTTPS POST REQUEST) 'await'until the server responds, without freezing. Currently we  use http since we got no certificats :-(
    // Tell server the payload format is JSON (application/json) and send the username & password as a JSON string.
    //Send to Docker
    //Include /api on the link so that we know it's a request to the backend, not the frontend. 
    const response = await fetch('http://localhost:80/api/signup', {
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ username: signupUsername, password: signupPassword })
    });

    // 5.  Convert JSON response from server back into a object
    const result = await response.json();
    alert(result.message); // Show message returned by backend
  };

  // 6. FUNCTION FOR LOGIN SUBMISSION
  const handleLogin = async (event) => {
    event.preventDefault();

    const response = await fetch('http://localhost:80/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUsername, password: loginPassword })
    });

    const result = await response.json();
    alert(result.message);
  };

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

            <button type="submit" style={styles.enterButton}>
              Create Account
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

            <button type="submit" style={styles.enterButton}>
              Log In
            </button>
          </form>
        </div>
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
    
