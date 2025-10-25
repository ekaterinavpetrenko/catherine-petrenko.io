function setLang(lang) {
  document.querySelectorAll('.lang').forEach(el => el.classList.remove('active'));
  document.getElementById(lang).classList.add('active');
}
