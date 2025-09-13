import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export default function AuthButtons() {
  const { loginWithRedirect, logout, user, isAuthenticated } = useAuth0();

  return (
    <div style={{ padding: '20px' }}>
      {!isAuthenticated && (
        <button onClick={() => loginWithRedirect()}>Login</button>
      )}
      {isAuthenticated && (
        <div>
          <h3>Welcome, {user.name}</h3>
          <p>Email: {user.email}</p>
          <img src={user.picture} alt="Profile" width="50" style={{ borderRadius: '50%' }}/>
          <br />
          <button onClick={() => logout({ returnTo: window.location.origin })}>Logout</button>
        </div>
      )}
    </div>
  );
}
