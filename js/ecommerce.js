(() => {
  const CART_KEY = 'praba-cart-v1';
  const MAX_ORDER_QTY = 10;
  const PUBLIC_SITE_URL = 'https://prabafish.netlify.app/';
  const getCart = () => JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  const saveCart = (c) => { localStorage.setItem(CART_KEY, JSON.stringify(c)); updateCount(); window.dispatchEvent(new CustomEvent('praba-cart-changed')); };
  const totalQty = c => c.reduce((sum, item) => sum + Math.max(0, Number(item.qty) || 0), 0);
  const money = n => new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0}).format(Number(n)||0);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getOrders = () => JSON.parse(localStorage.getItem('praba-orders-v1') || '[]');
  const saveOrders = x => localStorage.setItem('praba-orders-v1', JSON.stringify(x));
  const client = () => window.PrabaSupabase || null;
  const skuFor = (productId, packaging='economical') => {
    const size = ({'PRD-001':'KCL','PRD-002':'SDG','PRD-003':'BSR'})[productId] || '';
    const pack = packaging === 'regular' ? 'REG' : 'EKO';
    return size ? `PRB-JHN-${size}-${pack}` : '';
  };
  function updateCount(){ const n=getCart().reduce((a,b)=>a+Math.max(0,Number(b.qty)||0),0); document.querySelectorAll('#cartCount').forEach(x=>x.textContent=n); }
  async function products(){ const r=await fetch('data/products.json'); if(!r.ok) throw new Error('Katalog produk tidak dapat dimuat.'); return (await r.json()).products||[]; }
  function capCart(c){ let remaining=MAX_ORDER_QTY; const capped=[]; for(const item of c){const qty=Math.max(0,Number(item.qty)||0);const allowed=Math.min(qty,remaining);if(allowed>0)capped.push({...item,qty:allowed});remaining-=allowed;if(remaining<=0)break;} return capped; }
  async function addProduct(productId, packaging='economical', qty=1){
    const ps=await products(), p=ps.find(x=>x.id===productId); if(!p)return false;
    const requested=Math.max(0,Number(qty)||0); if(!requested)return false;
    const pack=p.packaging?.find(x=>(x.name?.id||'').toLowerCase()===packaging)||p.packaging?.[0];
    const key=`${productId}:${packaging}`, c=getCart(), row=c.find(x=>x.key===key), currentTotal=totalQty(c), allowed=Math.min(requested,Math.max(0,MAX_ORDER_QTY-currentTotal));
    if(!allowed)return false;
    if(row) row.qty=Math.max(0,Number(row.qty)||0)+allowed;
    else c.push({key,productId,packaging,variantSku:skuFor(productId,packaging),qty:allowed,name:p.name?.id||p.categoryLabel?.id,size:p.size?.id,price:pack?.price||0,image:p.image});
    saveCart(c); return allowed===requested;
  }
  function renderCheckout(){
    const root=document.querySelector('#checkoutCart'); if(!root)return;
    let c=capCart(getCart()); if(JSON.stringify(c)!==JSON.stringify(getCart())) saveCart(c);
    if(!c.length){root.innerHTML='<p>Keranjang masih kosong. <a href="produk.html">Lihat produk</a>.</p>';return;}
    const total=totalQty(c);
    root.innerHTML=c.map((x,i)=>{const qty=Math.max(0,Number(x.qty)||0),canPlus=total<MAX_ORDER_QTY;return `<div class="cart-row"><div><strong>${esc(x.name||'Produk')}</strong><small>${esc(x.size||'')} · ${esc(x.packaging)}</small><small>${money(x.price)} / unit</small></div><div class="cart-controls"><button type="button" data-cart-minus="${i}">−</button><input type="number" min="1" max="${MAX_ORDER_QTY}" value="${qty}" data-cart-input="${i}"><button type="button" data-cart-plus="${i}" ${canPlus?'':'disabled'}>+</button></div><strong>${money(x.price*qty)}</strong></div>`;}).join('')+`<div class="cart-total"><span>Total (${total} unit)</span><strong>${money(c.reduce((a,x)=>a+x.price*x.qty,0))}</strong></div>`;
    root.querySelectorAll('[data-cart-minus]').forEach(b=>b.onclick=()=>change(+b.dataset.cartMinus,-1));
    root.querySelectorAll('[data-cart-plus]').forEach(b=>b.onclick=()=>change(+b.dataset.cartPlus,1));
    root.querySelectorAll('[data-cart-input]').forEach(i=>i.onchange=()=>setQty(+i.dataset.cartInput,Math.max(1,Math.min(MAX_ORDER_QTY,+i.value||1))));
  }
  function change(i,d){const c=getCart();if(!c[i])return;const total=totalQty(c);if(d>0&&total>=MAX_ORDER_QTY)return;c[i].qty=Math.max(0,Math.min(MAX_ORDER_QTY,(Number(c[i].qty)||0)+d));if(!c[i].qty)c.splice(i,1);saveCart(c);renderCheckout();}
  function setQty(i,q){const c=getCart();if(!c[i])return;const other=totalQty(c)-(Number(c[i].qty)||0);c[i].qty=Math.max(1,Math.min(MAX_ORDER_QTY,Number(q)||1,MAX_ORDER_QTY-other));saveCart(c);renderCheckout();}
  function makeOrderNo(){const d=new Date(),p=d.toISOString().slice(0,10).replaceAll('-',''),r=Math.floor(Math.random()*9000+1000);return `PRB-${p}-${r}`;}
  function receipt(order){return `<div class="receipt"><div class="receipt-head"><div><span class="eyebrow">PRABA FISH</span><h2>${esc(order.orderNo)}</h2></div><span class="status-pill">${esc(order.status||'PESANAN BARU')}</span></div>${order.customer?.name?`<p><strong>Pelanggan</strong><br>${esc(order.customer.name)}<br>${esc(order.customer.phone||'')}<br>${esc(order.customer.address||'')}</p>`:''}<h3>Pesanan</h3>${(order.items||[]).map(x=>`<p>${esc(x.name||x.product_name||'Produk')} × ${x.qty} — ${money((x.price??x.unit_price)*x.qty)}</p>`).join('')}<hr><p><strong>Total: ${money(order.total)}</strong></p><div class="qr-box"></div><small>QR berisi tautan pelacakan publik tanpa data pelanggan di dalam QR.</small></div>`;}
  function drawQr(order,el){if(!el)return;const token=order?.trackingToken||'';const base=PUBLIC_SITE_URL.replace(/\/+$/,'/');const url=token?`${base}track.html?token=${encodeURIComponent(token)}`:`${base}track.html?order=${encodeURIComponent(order?.orderNo||'')}`;const img=`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;el.innerHTML=`<img src="${img}" alt="QR pelacakan ${esc(order?.orderNo||'')}" width="180" height="180" loading="lazy"><br><small>${token?'QR menggunakan token pelacakan aman.':'QR menggunakan nomor resi sebagai fallback.'}</small>`;}
  async function createOrder(customer){
    const c=capCart(getCart()); if(!c.length)throw new Error('Keranjang kosong.');
    const orderNo=makeOrderNo(); const total=c.reduce((a,x)=>a+(Number(x.price)||0)*(Number(x.qty)||0),0); const db=client(); if(!db)throw new Error('Koneksi database belum tersedia.');
    const items=c.map(x=>({variant_sku:x.variantSku||skuFor(x.productId,x.packaging),product_id:x.productId||'',product_name:x.name||'Produk',packaging:x.packaging||'',qty:Number(x.qty)||1,unit_price:Number(x.price)||0,line_total:(Number(x.price)||0)*(Number(x.qty)||0)}));
    if(items.some(x=>!x.variant_sku))throw new Error('Varian produk tidak dapat ditentukan. Silakan kembali ke Produk.');
    const {data,error}=await db.rpc('create_praba_order_v3',{p_order_number:orderNo,p_customer_name:String(customer.name||''),p_customer_phone:String(customer.phone||''),p_customer_address:String(customer.address||''),p_customer_note:String(customer.note||''),p_payment_method:String(customer.payment||'cod'),p_total:total,p_items:items});
    if(error)throw new Error(error.message||'Pesanan gagal disimpan ke Supabase.');
    if(!data?.order_number||!data?.tracking_token)throw new Error('Database tidak mengembalikan nomor resi/token pelacakan. Pesanan tidak dianggap selesai.');
    const order={orderNo:data.order_number,trackingToken:data.tracking_token,customer,items:c,total,status:data.status||'PESANAN BARU',createdAt:data.created_at||new Date().toISOString()};
    const local=getOrders();local.unshift(order);saveOrders(local);saveCart([]);return order;
  }
  async function submitCheckout(e){e.preventDefault();const msg=document.querySelector('#checkoutMessage'),btn=e.target.querySelector('button[type=submit]');if(btn)btn.disabled=true;msg.hidden=true;try{const fd=new FormData(e.target);const order=await createOrder({name:fd.get('name'),phone:fd.get('phone'),address:fd.get('address'),note:fd.get('note'),payment:fd.get('payment')});msg.hidden=false;msg.innerHTML='<strong>Pesanan berhasil dibuat.</strong> Nomor resi: <b>'+esc(order.orderNo)+'</b>.';e.target.reset();document.querySelector('#checkoutCart').innerHTML=receipt(order);drawQr(order,document.querySelector('#checkoutCart .qr-box'));}catch(err){msg.hidden=false;msg.textContent='Pesanan belum tersimpan: '+(err?.message||err); }finally{if(btn)btn.disabled=false;}}
  async function fetchTracking(params){const db=client();if(!db)throw new Error('Koneksi database belum tersedia.');const {data,error}=await db.rpc('get_praba_order_tracking_v1',params);if(error)throw new Error(error.message||'Pelacakan gagal.');return data;}
  async function trackOrder(){const form=document.querySelector('#trackForm'),out=document.querySelector('#trackResult');if(!form||!out)return;const params=new URLSearchParams(location.search),token=params.get('token'),pre=params.get('order');if(pre)form.orderNo.value=pre;const run=async()=>{out.innerHTML='<div class="commerce-message">Memuat data pesanan…</div>';try{const data=await fetchTracking(token?{p_order_number:null,p_tracking_token:token}:{p_order_number:(form.orderNo.value||'').trim(),p_tracking_token:null});if(!data){out.innerHTML='<div class="commerce-message">Pesanan tidak ditemukan.</div>';return;}out.innerHTML=receipt({orderNo:data.order_number,status:data.status,total:data.total,items:data.items||[],createdAt:data.created_at,trackingToken:token||''});drawQr({orderNo:data.order_number,trackingToken:token||''},out.querySelector('.qr-box'));}catch(err){out.innerHTML='<div class="commerce-message">Pelacakan gagal: '+esc(err.message||err)+'</div>';}};form.onsubmit=e=>{e.preventDefault();run();};if(token||pre)run();}
  function bindProductButtons(){document.querySelectorAll('[data-add-to-cart]').forEach(b=>b.onclick=()=>addProduct(b.dataset.addToCart,b.dataset.packaging||'economical',+(b.dataset.qty||1)));}
  function startScanner(){const el=document.querySelector('#qr-reader');if(!el||!window.Html5Qrcode)return;const scanner=new Html5Qrcode('qr-reader');scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:250,height:250}},text=>{scanner.stop().catch(()=>{});handleScanned(text);},()=>{}).catch(()=>{const out=document.querySelector('#scanResult');if(out)out.textContent='Kamera tidak dapat digunakan. Gunakan HTTPS dan izinkan kamera.';});}
  async function handleScanned(text){const out=document.querySelector('#scanResult');if(!out)return;try{const url=new URL(text);const token=url.searchParams.get('token');const orderNo=url.searchParams.get('order');if(!token&&!orderNo)throw new Error('QR bukan tautan pelacakan Praba.');const data=await fetchTracking(token?{p_order_number:null,p_tracking_token:token}:{p_order_number:orderNo,p_tracking_token:null});if(!data){out.innerHTML='<div class="commerce-message">Pesanan tidak ditemukan.</div>';return;}out.innerHTML=`<div class="commerce-message"><strong>${esc(data.order_number)}</strong><br>Status: ${esc(data.status)}<br>Total: ${money(data.total)}<br><button class="btn btn-gold" id="scanShipBtn" type="button">Konfirmasi Sudah Terkirim</button></div>`;document.querySelector('#scanShipBtn')?.addEventListener('click',()=>adminShip(data.order_number));}catch(err){out.innerHTML='<div class="commerce-message">QR tidak dapat diproses: '+esc(err.message||err)+'</div>';}}
  async function adminShip(orderNo){const db=client();const out=document.querySelector('#scanResult');if(!db){if(out)out.textContent='Koneksi database belum tersedia.';return;}const {data:user}=await db.auth.getUser();if(!user?.user){if(out)out.textContent='Silakan login admin terlebih dahulu.';return;}const {data,error}=await db.rpc('update_praba_order_status_v1',{p_order_number:orderNo,p_status:'SUDAH TERKIRIM'});if(error){if(out)out.textContent='Gagal mengubah status: '+error.message;return;}if(out)out.innerHTML='<div class="commerce-message"><strong>'+esc(orderNo)+'</strong><br>Status diperbarui menjadi <strong>'+esc(data?.status||'SUDAH TERKIRIM')+'</strong>.</div>';}
  async function initAdmin(){const panel=document.querySelector('#adminPanel'),authBox=document.querySelector('#adminAuth');if(!panel||!authBox)return;const db=client();if(!db)return;const loginForm=document.querySelector('#adminLogin'),msg=document.querySelector('#adminMessage');const session=await db.auth.getSession();if(session.data.session){authBox.hidden=true;panel.hidden=false;await renderAdmin();}loginForm.onsubmit=async e=>{e.preventDefault();const fd=new FormData(loginForm);msg.textContent='Memeriksa akun…';const {data,error}=await db.auth.signInWithPassword({email:String(fd.get('email')),password:String(fd.get('password'))});if(error){msg.textContent='Login gagal: '+error.message;return;}authBox.hidden=true;panel.hidden=false;await renderAdmin();};document.querySelector('#adminLogout').onclick=async()=>{await db.auth.signOut();authBox.hidden=false;panel.hidden=true;};document.querySelector('#refreshOrders').onclick=renderAdmin;}
  async function renderAdmin(){
    const db=client(),body=document.querySelector('#ordersBody'),stockBody=document.querySelector('#stockBody');
    if(!db)return;
    if(body){
      body.innerHTML='<tr><td colspan="5">Memuat…</td></tr>';
      const {data,error}=await db.rpc('get_praba_admin_orders_v1');
      if(error) body.innerHTML='<tr><td colspan="5">'+esc(error.message||'Akses admin ditolak.')+'</td></tr>';
      else {const orders=Array.isArray(data)?data:[];body.innerHTML=orders.map(o=>`<tr><td>${esc(o.order_number)}</td><td>${esc(o.customer_name)}</td><td>${money(o.total)}</td><td>${esc(o.status)}</td><td><button class="btn btn-gold" data-ship-order="${esc(o.order_number)}">Konfirmasi terkirim</button></td></tr>`).join('')||'<tr><td colspan="5">Belum ada pesanan.</td></tr>';body.querySelectorAll('[data-ship-order]').forEach(b=>b.onclick=async()=>{const {error}=await db.rpc('update_praba_order_status_v1',{p_order_number:b.dataset.shipOrder,p_status:'SUDAH TERKIRIM'});if(error)alert(error.message);else renderAdmin();});}
    }
    if(stockBody){
      stockBody.innerHTML='<tr><td colspan="6">Memuat stok…</td></tr>';
      const {data,error}=await db.rpc('get_praba_admin_stock_v1');
      if(error){stockBody.innerHTML='<tr><td colspan="6">'+esc(error.message||'Gagal memuat stok.')+'</td></tr>';return;}
      const rows=Array.isArray(data)?data:[];
      stockBody.innerHTML=rows.map(x=>`<tr><td>${esc(x.sku)}</td><td>${esc(x.name||'')}</td><td>${esc(x.packaging||'')}</td><td>${esc(x.available)}</td><td><input type="number" min="0" value="${esc(x.quantity)}" data-stock-input="${esc(x.sku)}"></td><td><button class="btn" data-stock-save="${esc(x.sku)}">Simpan</button></td></tr>`).join('')||'<tr><td colspan="6">Belum ada varian stok.</td></tr>';
      stockBody.querySelectorAll('[data-stock-save]').forEach(b=>b.onclick=async()=>{const sku=b.dataset.stockSave;const input=[...stockBody.querySelectorAll('[data-stock-input]')].find(el=>el.dataset.stockInput===sku);const quantity=Math.max(0,parseInt(input?.value,10)||0);const {error}=await db.rpc('set_praba_stock_v1',{p_sku:sku,p_quantity:quantity});if(error)alert(error.message);else renderAdmin();});
    }
  }
  function init(){updateCount();renderCheckout();trackOrder();bindProductButtons();initAdmin();document.querySelector('#checkoutForm')?.addEventListener('submit',submitCheckout);}
  window.PrabaEcom={addProduct,startScanner,handleScanned,adminShip,init};
  document.addEventListener('DOMContentLoaded',init);
  window.addEventListener('praba-cart-changed',()=>{updateCount();renderCheckout();});
})();
