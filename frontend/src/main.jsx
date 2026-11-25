import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './user_management/App';
import {
  clearStoredSession,
  getAuthenticatedUsername
} from './user_management/authApi';
import HomePage from './song_upload/home_page/Homepage';
import UploadPage from './song_upload/home_page/UploadPage';

function Root() {
  const hasStoredSession = Boolean(
    localStorage.getItem('accessToken') || localStorage.getItem('refreshToken')
  );
  const [authenticatedUsername, setAuthenticatedUsername] = useState(
    () => hasStoredSession ? localStorage.getItem('username') : null
  );
  const [isRestoringSession, setIsRestoringSession] = useState(hasStoredSession);
  const [currentPage, setCurrentPage] = useState('home');

  useEffect(() => {
    if (!hasStoredSession) return undefined;

    let isMounted = true;
    getAuthenticatedUsername()
      .then((username) => {
        if (!isMounted) return;
        if (username) {
          localStorage.setItem('username', username);
          setAuthenticatedUsername(username);
        } else {
          clearStoredSession();
          setAuthenticatedUsername(null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthenticatedUsername(localStorage.getItem('username'));
        }
      })
      .finally(() => {
        if (isMounted) setIsRestoringSession(false);
      });

    return () => {
      isMounted = false;
    };
  }, [hasStoredSession]);

  if (isRestoringSession) {
    return <p role="status">Restoring your session…</p>;
  }

  if (!authenticatedUsername) {
    return <App onAuthenticated={setAuthenticatedUsername} />;
  }

  if (currentPage === 'upload') {
    return (
      <UploadPage
        username={authenticatedUsername}
        onBack={() => setCurrentPage('home')}
        onUpload={() => setCurrentPage('upload')}
      />
    );
  }

  return (
    <HomePage
      username={authenticatedUsername}
      onUpload={() => setCurrentPage('upload')}
    />
  );
} //passes down authenticated username variable to home page component and passes down the function to set the authenticated username to the app component

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);