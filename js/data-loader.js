(() => {
  const cache = {};
  const lang = () => window.PrabaI18n?.getLanguage?.() || localStorage.getItem('praba-language') || 'id';
  async function load(path){ if(cache[path]) return cache[path]; const r=await fetch(path); if(!r.ok) throw new Error(`${path} ${r.status}`); cache[path]=await r.json(); return cache[path]; }
  const text = (obj) => typeof obj === 'string' ? obj : (obj?.[lang()] ?? obj?.id ?? '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const wa = q => `https://wa.me/6285161116105?text=${encodeURIComponent(q)}`;
  async function sources(){ return (await load('sources/source-registry.json')).sources || []; }
  async function remoteStock(){
    const client=window.PrabaSupabase;
    if(!client) return null;
    try{
      const {data,error}=await client
        .from('inventory_stock')
        .select('variant_id,quantity,reserved_quantity,product_variants(sku,name,price,packaging,active)')
        .eq('product_variants.active',true);
      if(error) throw error;
      const map={};
      (data||[]).forEach(row=>{
        const v=row.product_variants;
        if(v?.sku) map[v.sku]={
          quantity:Number(row.quantity||0),
          reserved:Number(row.reserved_quantity||0),
          available:Math.max(0,Number(row.quantity||0)-Number(row.reserved_quantity||0)),
          variantId:row.variant_id,
          sku:v.sku
        };
      });
      return map;
    }catch(error){
      console.warn('Supabase stock unavailable:',error);
      return null;
    }
  }
  function sourceMap(list){ return new Map(list.map(s=>[s.id,s])); }
  function sourceLink(s){ if(!s) return ''; const l=lang(); const label=l==='zh'?'查看来源 ↗':l==='en'?'View Source ↗':'Lihat Sumber ↗'; const pending=l==='zh'?'来源尚未验证':l==='en'?'Source not yet verified':'Sumber belum diverifikasi'; if(s.url) return `<a href="${esc(s.url)}" target="_blank" rel="noopener">${label}</a>`; return `<span class="source-pending">${pending}</span>`; }
  async function renderProducts(root){
    const data=(await load('data/products.json')).products||[];
    const product=data.filter(x=>x.status!=='archived')[0];
    if(!product){ root.innerHTML=''; return; }
    const currentLang=lang();
    const t=(key,id,en,zh)=>window.PrabaI18n?.t?.(key) || (currentLang==='en'?en:currentLang==='zh'?zh:id);
    const currency=n=>new Intl.NumberFormat(currentLang==='id'?'id-ID':'en-US',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n).replace('IDR','Rp');
    const sizes=data.filter(x=>x.status!=='archived').sort((a,b)=>({Kecil:1,Sedang:2,Besar:3}[a.size?.id]||0)-({Kecil:1,Sedang:2,Besar:3}[b.size?.id]||0));
    const image=product.image||'images/produk-ikan-asap.jpg';
    const packaging=product.packaging||[];
    const economical=packaging.find(x=>x.name?.id==='Ekonomis')||packaging[0];
    const regular=packaging.find(x=>x.name?.id==='Reguler')||packaging[1]||packaging[0];
    const remote=await remoteStock();
    const skuFor=(size,pack)=>`PRB-JHN-${({Kecil:'KCL',Sedang:'SDG',Besar:'BSR'}[size]||'KCL')}-${pack==='regular'?'REG':'EKO'}`;
    root.innerHTML=`
      <section class="order-panel" aria-labelledby="order-title">
        <div class="order-product-head">
          <div class="order-product-image"><img src="${esc(image)}" data-placeholder="images/placeholder-image.svg" alt="${esc(text(product.categoryLabel||product.name))}" loading="lazy"></div>
          <div>
            <span class="category">${esc(t('products.productType','Jenis produk','Product type','产品类型'))}</span>
            <h2 id="order-title">${esc(text(product.categoryLabel||'Asap Kepala Ikan'))}</h2>
            <p>${esc(text(product.fishType))} · ${esc(text(product.rawMaterial))}</p>
          </div>
        </div>
        <div class="order-section-title"><h3>${esc(t('products.size','Ukuran','Size','规格'))}</h3><span>${esc(t('products.maxNotice','Maksimal 10 unit per pesanan.','Maximum 10 units per order.','每笔订单最多10份。'))}</span></div>
        <div class="order-size-list">
          ${sizes.map((p,i)=>{ const skuE=skuFor(p.size?.id,'economical'); const skuR=skuFor(p.size?.id,'regular'); const e=remote?.[skuE]; const r=remote?.[skuR]; const max=Math.min(10,Math.max(e?.available||0,r?.available||0)); const unavailable=remote && max===0; return `<div class="order-size-row${unavailable?' stock-unavailable':''}" data-size-id="${esc(p.id)}" data-size-name="${esc(p.size?.id||'')}" data-price-economical="${economical?.price||0}" data-price-regular="${regular?.price||0}" data-stock-economical="${e?.available??''}" data-stock-regular="${r?.available??''}">
            <div class="order-size-info"><strong>${esc(text(p.size))}</strong><small>${esc(t('products.minimum','Minimal','Minimum','最低数量'))}: ${esc(text(p.minimumPurchase))}</small><small class="stock-label">${remote ? (unavailable ? esc(t('products.outOfStock','Stok habis','Out of stock','缺货')) : `${esc(t('products.stock','Stok','Stock','库存'))}: ${max}`) : ''}</small></div>
            <div class="order-size-price"><span>${currency(economical?.price||0)}</span><small>${esc(t('products.economical','Ekonomis','Economical','经济装'))}</small></div>
            <div class="qty-control" aria-label="${esc(t('products.quantity','Jumlah','Quantity','数量'))}"><button type="button" class="qty-minus" aria-label="Kurangi">−</button><input class="qty-input" type="number" min="0" max="${max}" value="0" inputmode="numeric" ${unavailable?'disabled':''}><button type="button" class="qty-plus" aria-label="Tambah" ${unavailable?'disabled':''}>+</button></div>
          </div>`; }).join('')}
        </div>
        <div class="pack-choice">
          <h3>${esc(t('products.package','Kemasan','Packaging','包装'))}</h3>
          <label><input type="radio" name="productPackaging" value="economical" checked><span><strong>${esc(t('products.economical','Ekonomis','Economical','经济装'))}</strong><small>${currency(economical?.price||0)}</small></span></label>
          <label><input type="radio" name="productPackaging" value="regular"><span><strong>${esc(t('products.regular','Reguler','Regular','标准装'))}</strong><small>${currency(regular?.price||0)}</small></span></label>
        </div>
        <div class="order-summary" aria-live="polite">
          <div><span>${esc(t('products.totalUnits','Total unit','Total units','总数量'))}</span><strong id="order-total-units">0</strong></div>
          <div><span>${esc(t('products.total','Total harga','Total price','总价'))}</span><strong id="order-total-price">Rp0</strong></div>
          <p id="order-remaining">${esc(t('products.remaining','Sisa kapasitas pesanan','Order capacity remaining','剩余可订数量'))}: 10</p>
        </div>
        <p class="order-note">${esc(t('products.noteOrder','Harga dihitung otomatis berdasarkan jumlah unit dan kemasan yang dipilih.','The price is calculated automatically from the selected quantity and packaging.','价格将根据所选数量和包装自动计算。'))}</p>
        <div class="order-actions"><button type="button" class="btn btn-gold" id="order-whatsapp" disabled>${esc(t('products.orderWhatsApp','Pesan via WhatsApp','Order via WhatsApp','通过 WhatsApp 下单'))}</button><span id="order-empty" class="order-error" hidden>${esc(t('products.empty','Pilih minimal 1 unit untuk melanjutkan.','Select at least 1 unit to continue.','请选择至少1份后继续。'))}</span><button type="button" class="btn" id="order-cart" disabled>Tambah ke Keranjang</button></div>
      </section>`;

    const rows=[...root.querySelectorAll('.order-size-row')];
    const totalUnitsEl=root.querySelector('#order-total-units');
    const totalPriceEl=root.querySelector('#order-total-price');
    const remainingEl=root.querySelector('#order-remaining');
    const orderBtn=root.querySelector('#order-whatsapp');
    const emptyEl=root.querySelector('#order-empty');
    const cartBtn=root.querySelector('#order-cart');
    const MAX=10;
    const selectedPackaging=()=>root.querySelector('input[name="productPackaging"]:checked')?.value==='regular'?'regular':'economical';
    const unitPrice=()=>selectedPackaging()==='regular'?(regular?.price||0):(economical?.price||0);
    const rowStockMax=row=>{ const value=row.dataset[`stock${selectedPackaging()==='regular'?'Regular':'Economical'}`]; return value===''||value==null ? MAX : Math.min(MAX,Math.max(0,Number(value)||0)); };
    const update=()=>{
      rows.forEach(row=>{ const input=row.querySelector('.qty-input'); const max=rowStockMax(row); input.max=String(max); const q=Math.max(0,Math.min(max,parseInt(input.value,10)||0)); input.value=String(q); });
      let total=rows.reduce((sum,row)=>sum+Math.max(0,parseInt(row.querySelector('.qty-input').value,10)||0),0);
      if(total>MAX){
        let overflow=total-MAX;
        for(let i=rows.length-1;i>=0 && overflow>0;i--){ const input=rows[i].querySelector('.qty-input'); const q=Math.max(0,parseInt(input.value,10)||0); const cut=Math.min(q,overflow); input.value=q-cut; overflow-=cut; }
        total=MAX;
      }
      const price=total*unitPrice();
      totalUnitsEl.textContent=String(total);
      totalPriceEl.textContent=currency(price);
      remainingEl.textContent=`${t('products.remaining','Sisa kapasitas pesanan','Order capacity remaining','剩余可订数量')}: ${MAX-total}`;
      orderBtn.disabled=total===0; if(cartBtn) cartBtn.disabled=total===0;
      emptyEl.hidden=total!==0;
      rows.forEach(row=>{
        const input=row.querySelector('.qty-input'); const q=parseInt(input.value,10)||0;
        row.querySelector('.qty-minus').disabled=q<=0;
        row.querySelector('.qty-plus').disabled=total>=MAX || q>=rowStockMax(row);
      });
    };
    rows.forEach(row=>{
      const input=row.querySelector('.qty-input');
      row.querySelector('.qty-minus').addEventListener('click',()=>{input.value=Math.max(0,(parseInt(input.value,10)||0)-1);update();});
      row.querySelector('.qty-plus').addEventListener('click',()=>{if((parseInt(input.value,10)||0)<10){input.value=(parseInt(input.value,10)||0)+1;update();}});
      input.addEventListener('input',()=>{input.value=Math.min(10,Math.max(0,parseInt(input.value,10)||0));update();});
    });
    root.querySelectorAll('input[name="productPackaging"]').forEach(r=>r.addEventListener('change',update));
    cartBtn?.addEventListener('click',async()=>{
      const pack=selectedPackaging();
      for(const row of rows){ const q=parseInt(row.querySelector('.qty-input').value,10)||0; if(!q) continue; await window.PrabaEcom?.addProduct?.(row.dataset.sizeId,pack,q); }
      if(cartBtn){ const old=cartBtn.textContent; cartBtn.textContent='✓ Ditambahkan'; setTimeout(()=>cartBtn.textContent=old,1400); }
    });
    orderBtn.addEventListener('click',()=>{
      const pack=selectedPackaging()==='regular'?(regular?.name?.[currentLang]||'Reguler'):(economical?.name?.[currentLang]||'Ekonomis');
      const lines=rows.map(row=>{const q=parseInt(row.querySelector('.qty-input').value,10)||0; const p=sizes.find(x=>x.id===row.dataset.sizeId); return q?`${text(p.size)}: ${q}`:null;}).filter(Boolean);
      const total=parseInt(totalUnitsEl.textContent,10)||0;
      const message=`Halo Praba Sea Procesing Food, saya ingin memesan Asap Kepala Ikan.\n${lines.join('\n')}\nKemasan: ${pack}\nTotal unit: ${total}\nTotal harga: ${totalPriceEl.textContent}`;
      window.open(wa(message),'_blank','noopener');
    });
    update();
  }
  async function renderHomeProduct(root){
    const data=(await load('data/products.json')).products||[];
    const sizes=data.filter(x=>x.status!=='archived').sort((a,b)=>({Kecil:1,Sedang:2,Besar:3}[a.size?.id]||0)-({Kecil:1,Sedang:2,Besar:3}[b.size?.id]||0));
    const product=sizes[0];
    if(!product){ root.innerHTML=''; return; }
    const currentLang=lang();
    const t=(key,id,en,zh)=>window.PrabaI18n?.t?.(key) || (currentLang==='en'?en:currentLang==='zh'?zh:id);
    const currency=n=>new Intl.NumberFormat(currentLang==='id'?'id-ID':'en-US',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n).replace('IDR','Rp');
    const packaging=product.packaging||[];
    const economical=packaging.find(x=>x.name?.id==='Ekonomis')||packaging[0];
    const regular=packaging.find(x=>x.name?.id==='Reguler')||packaging[1]||packaging[0];
    const image=product.image||'images/produk-ikan-asap.jpg';
    root.innerHTML=`
      <article class="home-product-feature-card">
        <div class="home-product-feature-image">
          <img src="${esc(image)}" data-placeholder="images/placeholder-image.svg" alt="${esc(text(product.categoryLabel||product.name))}" loading="lazy" decoding="async">
          <span class="home-product-visual-note">${esc(t('common.aiFoodNote','Ilustrasi katalog','Catalog illustration','目录插图'))}</span>
        </div>
        <div class="home-product-feature-body">
          <div class="home-product-feature-copy">
            <span class="category">${esc(text(product.categoryLabel||'Asap Kepala Ikan'))}</span>
            <h3>${esc(t('home.productSingleTitle','Asap Kepala Ikan','Smoked Fish Head','烟熏鱼头'))}</h3>
            <p>${esc(text(product.description))}</p>
            <div class="home-product-meta">
              <span><strong>${esc(text(product.fishType))}</strong> · ${esc(text(product.rawMaterial))}</span>
              <span>${esc(t('home.productStorage','Lebih baik disimpan dalam pendingin/refrigerasi.','Better kept chilled/refrigerated.','建议冷藏保存。'))}</span>
            </div>
          </div>
          <div class="home-product-options">
            <div class="home-product-option-group">
              <h4>${esc(t('products.size','Ukuran','Size','规格'))}</h4>
              <div class="home-product-size-list">
                ${sizes.map(p=>`<div class="home-product-size-item"><strong>${esc(text(p.size))}</strong><span>${esc(t('products.minimum','Minimal','Minimum','最低数量'))}: ${esc(text(p.minimumPurchase))}</span></div>`).join('')}
              </div>
            </div>
            <div class="home-product-option-group">
              <h4>${esc(t('products.package','Kemasan','Packaging','包装'))}</h4>
              <div class="home-product-pack-list">
                <div><strong>${esc(t('products.economical','Ekonomis','Economical','经济装'))}</strong><span>${currency(economical?.price||0)}</span></div>
                <div><strong>${esc(t('products.regular','Reguler','Regular','标准装'))}</strong><span>${currency(regular?.price||0)}</span></div>
              </div>
            </div>
            <a class="btn btn-gold home-product-cta" href="produk.html">${esc(t('home.productDetail','Lihat detail & pesan','View details & order','查看详情并下单'))} →</a>
          </div>
        </div>
      </article>`;
  }

  async function renderRecipes(root){
    const data=(await load('data/recipes.json')).recipes||[]; const sm=sourceMap(await sources());
    root.innerHTML=data.filter(x=>x.status!=='archived').map((r,i)=>{const img=r.imageIds?.[0]; const s=sm.get(r.sourceIds?.[0]); const title=text(r.title), desc=text(r.description); const ingredients=r.ingredients?.[lang()]||r.ingredients?.id||[]; const steps=r.steps?.[lang()]||r.steps?.id||[]; return `<article class="recipe-card" data-category="${esc(r.category)}"><div class="recipe-number">${String(i+1).padStart(2,'0')}</div><div class="recipe-image"><img alt="Ilustrasi ${esc(title)}" data-placeholder="images/placeholder-image.svg" data-source-id="${esc(img||'')}" loading="lazy" decoding="async" src="${esc(r.image||'images/placeholder-image.svg')}"/></div><span class="category">${esc(text(r.label||r.category))}</span><h2>${esc(title)}</h2><p class="recipe-desc">${esc(desc)}</p><div class="recipe-meta"><span>⏱ ${esc(r.timeMinutes)} ${esc(window.PrabaI18n?.t?.('common.minutes')||'min')}</span><span>🍽 ${esc(r.servings)} ${esc(window.PrabaI18n?.t?.('common.servings')||'servings')}</span><span>♨ ${esc(r.difficultyLabel?.[lang()]||r.difficulty)}</span></div><details class="recipe-details" open><summary>${esc(window.PrabaI18n?.t?.('common.recipeDetails')||'Ingredients & method')}</summary><div class="recipe-sections"><div class="recipe-section"><h3>${esc(window.PrabaI18n?.t?.('common.ingredients')||'Ingredients')}</h3><ul>${ingredients.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="recipe-section"><h3>${esc(window.PrabaI18n?.t?.('common.method')||'Method')}</h3><ol>${steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div></div></details>${s?`<div class="data-source"><span>${esc(window.PrabaI18n?.t?.('common.source')||'Source')} ${esc(s.organization)}</span> ${sourceLink(s)}</div>`:''}</article>`}).join('');
    window.PrabaRecipeUI?.init?.();
  }
  async function renderRecipePreview(root){
    const data=(await load('data/recipes.json')).recipes||[];
    root.innerHTML=data.slice(0,3).map(r=>`<a href="resep.html" class="recipe-preview-item"><img alt="${esc(text(r.title))}" data-placeholder="images/placeholder-image.svg" data-source-id="${esc(r.imageIds?.[0]||'')}" loading="lazy" decoding="async" src="${esc(r.image||'images/placeholder-image.svg')}"/><span>${esc(text(r.title))}</span></a>`).join('');
  }
  async function renderArticles(root){
    const data=(await load('data/articles.json')).articles||[]; const sm=sourceMap(await sources());
    root.innerHTML=data.filter(x=>x.status!=='archived').map(a=>{const s=sm.get(a.sourceIds?.[0]); return `<article class="full-article" id="${esc(a.category)}"><div class="article-image large"><img alt="${esc(text(a.title))}" data-placeholder="images/placeholder-image.svg" data-source-id="${esc(a.imageIds?.[0]||'')}" loading="lazy" decoding="async" src="${esc(a.image||'images/produk-ikan-asap.jpg')}"/><span>${esc(text(a.categoryLabel||a.category))}</span></div><span>${esc(text(a.categoryLabel||a.category))}</span><h2>${esc(text(a.title))}</h2>${(a.paragraphs?.[lang()]||a.paragraphs?.id||[]).map(p=>`<p>${esc(p)}</p>`).join('')}${s?`<p class="source-note">${esc(lang()==='id'?'Sumber: ':lang()==='zh'?'来源：':'Source: ')}${esc(s.organization)} · ${sourceLink(s)}</p>`:''}</article>`}).join('');
    window.PrabaBlogUI?.init?.();
  }
  async function renderReferences(root){
    const refs=(await load('data/references.json')).references||[]; const sm=sourceMap(await sources());
    root.innerHTML=refs.map(r=>{const s=sm.get(r.sourceIds?.[0]); return `<article class="reference-card"><span class="category">${esc(r.category)}</span><h3>${esc(text(r.title))}</h3><p>${esc(r.organization)}</p>${s?sourceLink(s):''}</article>`}).join('');
  }
  async function renderIndustry(root){
    const data=(await load('data/industry-data.json')).industryData||[];
    const sm=sourceMap(await sources());
    const l=lang();
    const sourceLabel=l==='zh'?'来源：':l==='en'?'Source: ':'Sumber: ';
    const vesselLabel=l==='zh'?'艘船':l==='en'?'vessels':'kapal';
    const orgLabel=(s)=>{
      const org=s?.organization||'';
      if(l==='zh'){
        if(org==='Pemerintah Provinsi Jawa Tengah') return '中爪哇省政府';
        if(org==='Sumber pemerintah/instansi terkait') return '相关政府/机构来源';
      }
      if(l==='en'){
        if(org==='Pemerintah Provinsi Jawa Tengah') return 'Central Java Provincial Government';
        if(org==='Sumber pemerintah/instansi terkait') return 'Relevant government/institution source';
      }
      return org;
    };
    root.innerHTML=data.map(d=>{
      const s=sm.get(d.sourceIds?.[0]);
      return `<article class="stat-card"><strong>${esc(d.value)}${d.unit==='percent'?'%':' '+d.unit}</strong><span>${esc(text(d.metric))}</span><small>${esc(d.date||'')} ${d.vessels?`• ${esc(d.vessels)} ${vesselLabel}`:''}</small>${s?`<div class="data-source"><span>${esc(sourceLabel)}${esc(orgLabel(s))}</span> ${sourceLink(s)}</div>`:''}</article>`
    }).join('');
  }
  async function renderAll(){
    for(const el of document.querySelectorAll('[data-json-render]')){ try{ const type=el.dataset.jsonRender; if(type==='products') await renderProducts(el); if(type==='home-product') await renderHomeProduct(el); if(type==='recipes') await renderRecipes(el); if(type==='recipe-preview') await renderRecipePreview(el); if(type==='articles') await renderArticles(el); if(type==='references') await renderReferences(el); if(type==='industry') await renderIndustry(el); }catch(e){ console.warn('Praba data render failed',type,e); } }
  }
  window.PrabaData={load,renderAll,renderProducts,renderHomeProduct,renderRecipes,renderArticles,renderReferences,renderIndustry,text,sources,remoteStock};
  document.addEventListener('DOMContentLoaded', renderAll);
  window.addEventListener('praba-language-changed', renderAll);
})();
