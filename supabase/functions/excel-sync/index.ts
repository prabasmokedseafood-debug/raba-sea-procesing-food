// Supabase Edge Function skeleton for Excel Online synchronization.
// Store the Power Automate HTTP endpoint as an Edge Function secret:
// POWER_AUTOMATE_WEBHOOK
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const payload = await req.json();
  const webhook = Deno.env.get('POWER_AUTOMATE_WEBHOOK');
  if (!webhook) return new Response(JSON.stringify({error:'POWER_AUTOMATE_WEBHOOK is not configured'}), {status:500,headers:{'content-type':'application/json'}});
  const response = await fetch(webhook, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
  return new Response(JSON.stringify({ok:response.ok}), {status:response.ok?200:502,headers:{'content-type':'application/json'}});
});
