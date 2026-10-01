const menuButton=document.querySelector(".menu-toggle");const nav=document.querySelector(".nav-menu");if(menuButton&&nav){menuButton.addEventListener("click",()=>{const open=nav.classList.toggle("open");menuButton.setAttribute("aria-expanded",String(open));menuButton.setAttribute("aria-label",open?"Tutup menu":"Buka menu")});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&nav.classList.contains("open")){nav.classList.remove("open");menuButton.setAttribute("aria-expanded","false");menuButton.setAttribute("aria-label","Buka menu")}});document.addEventListener("click",e=>{if(nav.classList.contains("open")&&!nav.contains(e.target)&&!menuButton.contains(e.target)){nav.classList.remove("open");menuButton.setAttribute("aria-expanded","false");menuButton.setAttribute("aria-label","Buka menu")}})}document.querySelectorAll(".nav-menu a").forEach(a=>a.addEventListener("click",()=>nav&&nav.classList.remove("open")));const search=document.querySelector("#searchInput");if(search){search.addEventListener("input",()=>{const q=search.value.toLowerCase().trim();document.querySelectorAll(".full-article").forEach(article=>{article.style.display=article.textContent.toLowerCase().includes(q)?"block":"none"})})}

// Filter dan pencarian resep
const recipeSearch=document.querySelector('#recipeSearch');
const recipeFilters=document.querySelectorAll('.recipe-filter');
const recipeCards=document.querySelectorAll('.recipe-card');
const recipeEmpty=document.querySelector('#recipeEmpty');
if(recipeCards.length){
  let activeFilter='all';
  const applyRecipeFilter=()=>{
    const q=(recipeSearch?.value||'').toLowerCase().trim();
    let visible=0;
    recipeCards.forEach(card=>{
      const matchesFilter=activeFilter==='all'||card.dataset.category===activeFilter;
      const matchesSearch=!q||card.textContent.toLowerCase().includes(q);
      const show=matchesFilter&&matchesSearch;
      card.style.display=show?'block':'none';
      if(show) visible++;
    });
    if(recipeEmpty) recipeEmpty.style.display=visible?'none':'block';
  };
  recipeFilters.forEach(btn=>btn.addEventListener('click',()=>{
    recipeFilters.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter=btn.dataset.filter;
    applyRecipeFilter();
  }));
  recipeSearch?.addEventListener('input',applyRecipeFilter);
}

// Fallback gambar terpusat: mencegah gambar rusak memecah layout.
document.querySelectorAll('img').forEach((img)=>{
  img.addEventListener('error',function(){
    if(this.dataset.fallbackApplied==='true') return;
    this.dataset.fallbackApplied='true';
    this.src=this.dataset.placeholder||'images/placeholder-image.svg';
  });
});

// Re-apply UI behaviors after JSON-rendered content is inserted.
window.addEventListener('praba-language-changed',()=>{document.querySelectorAll('img').forEach(img=>{if(!img.dataset.fallbackBound){img.dataset.fallbackBound='true';img.addEventListener('error',function(){if(this.dataset.fallbackApplied==='true')return;this.dataset.fallbackApplied='true';this.src=this.dataset.placeholder||'images/placeholder-image.svg';});}});});

window.PrabaBlogUI={init(){const search=document.querySelector('#searchInput');const articles=document.querySelectorAll('.full-article');if(!search||!articles.length)return;search.oninput=()=>{const q=search.value.toLowerCase().trim();articles.forEach(a=>a.style.display=a.textContent.toLowerCase().includes(q)?'block':'none');};}};
