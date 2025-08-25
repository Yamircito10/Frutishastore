document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorEl = document.getElementById('loginError');

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    window.location.href = 'index.html';
  } catch (error) {
    console.error(error);
    errorEl.textContent = 'Credenciales incorrectas. Inténtalo de nuevo.';
  }
});

// Si ya está autenticado, ir directo a index.html
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    window.location.href = 'index.html';
  }
});