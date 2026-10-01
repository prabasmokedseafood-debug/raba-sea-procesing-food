(function(){
  const sequence=['FIRST IN','STORAGE','MONITORING','FIRST OUT'];
  function init(el){ if(!el)return; el.innerHTML=sequence.map((x,i)=>`<span class="fifo-step" data-step="${i+1}">${x}</span>`).join('<span class="fifo-arrow" aria-hidden="true">→</span>'); }
  window.PrabaFIFO={init};
  document.addEventListener('DOMContentLoaded',()=>document.querySelectorAll('[data-fifo]').forEach(init));
})();
