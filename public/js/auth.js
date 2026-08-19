import { supabase } from './supabaseClient.js';

// Protege una página de administración: si no hay sesión, redirige al login.
// Llamar al principio de cada página del panel (admin/*.html).
export async function requireAuth(){
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/login.html';
    return null;
  }
  return session;
}

export async function signIn(email, password){
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut(){
  await supabase.auth.signOut();
  window.location.href = '/login.html';
}
