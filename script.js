function setLang(lang) {
  const active = document.querySelector('.lang.active');
  const target = document.getElementById(lang);

  if(active === target) return;

  active.classList.remove('active');
  target.classList.add('active');
}