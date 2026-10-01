(() => {
  const cfg = window.PRABA_CONFIG || {};
  const key = cfg.supabaseAnonKey || '';
  if (!window.supabase || !cfg.supabaseUrl || !key || key === 'PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE') {
    window.PrabaSupabase = null;
    return;
  }
  try {
    window.PrabaSupabase = window.supabase.createClient(cfg.supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
  } catch (error) {
    console.warn('Supabase client initialization failed:', error);
    window.PrabaSupabase = null;
  }
})();
