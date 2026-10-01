(function(){
  function init(){
    const search=document.querySelector('#recipeSearch'), filters=document.querySelectorAll('.recipe-filter'), cards=document.querySelectorAll('.recipe-card'), empty=document.querySelector('#recipeEmpty'); if(!cards.length)return;
    let active='all'; const run=()=>{const q=(search?.value||'').toLowerCase().trim();let n=0;cards.forEach(c=>{const ok=(active==='all'||c.dataset.category===active)&&(!q||c.textContent.toLowerCase().includes(q));c.style.display=ok?'block':'none';if(ok)n++});if(empty)empty.style.display=n?'none':'block'};
    filters.forEach(b=>b.addEventListener('click',()=>{filters.forEach(x=>x.classList.remove('active'));b.classList.add('active');active=b.dataset.filter;run()})); search?.addEventListener('input',run); run();
  }
  window.PrabaRecipeUI={init};
  window.PrabaRecipes={loadRecipes:()=>window.PrabaData?.load('data/recipes.json').then(x=>x.recipes||[])};
  document.addEventListener('DOMContentLoaded',init);
})();
