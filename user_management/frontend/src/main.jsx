import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import HomePage from './home_page/Homepage';
import UploadPage from './home_page/UploadPage';

function Root() {
  const [authenticatedUsername, setAuthenticatedUsername] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');

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