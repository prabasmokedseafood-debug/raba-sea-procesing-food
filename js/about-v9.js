(() => {
  const page = document.querySelector('.about-command-v9');
  if (!page) return;
  const progress = page.querySelector('.command-progress-v9 span');
  const links = [...page.querySelectorAll('.command-nav-v9 a')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = `${max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0}%`;
    let current = sections[0];
    for (const section of sections) if (window.scrollY + 170 >= section.offsetTop) current = section;
    links.forEach(a => a.classList.toggle('active', current && a.getAttribute('href') === '#' + current.id));
  };
  window.addEventListener('scroll', update, {passive:true});
  window.addEventListener('resize', update);
  update();

  const reveal = [...document.querySelectorAll('.about-manifesto-v9, .about-intro-v8, .juwana-showcase-v8, .data-story-v8, .quality-system-v8, .split-feature-v8, .iso-v8, .section#mutu-ikan, .section#perbandingan-mutu, .dark-panel-v8, .section#rantai-dingin, .section#fifo, .commitment-v8, .section#referensi')];
  reveal.forEach(el => el.classList.add('reveal-v9'));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } }), {threshold:.08, rootMargin:'0px 0px -50px'});
    reveal.forEach(el => io.observe(el));
  } else reveal.forEach(el => el.classList.add('is-visible'));
})();
