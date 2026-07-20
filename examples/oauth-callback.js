(function () {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error') || params.get('error_description');

  const expected = sessionStorage.getItem('reports.oauth.state');
  if (expected && state && expected !== state) {
    document.body.textContent = 'Invalid OAuth state.';
    return;
  }

  const payload = {
    type: 'reports-oauth-callback',
    code,
    state,
    error: error || (!code ? 'missing_code' : null),
  };

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(payload, window.location.origin);
    if (!payload.error) {
      window.close();
    } else {
      document.body.textContent = 'OAuth error: ' + payload.error;
    }
  } else {
    document.body.textContent = payload.error
      ? 'OAuth error: ' + payload.error
      : 'Code reçu. Vous pouvez fermer cette fenêtre.';
  }
})();
