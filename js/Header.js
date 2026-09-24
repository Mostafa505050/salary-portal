const App = {
  LOGO: 'https://upload.wikimedia.org/wikipedia/ar/archive/8/85/20231203193514%21%D8%A7%D9%84%D8%B4%D8%B1%D9%83%D8%A9_%D8%A7%D9%84%D9%82%D8%A7%D8%A8%D8%B6%D8%A9_%D9%84%D9%83%D9%87%D8%B1%D8%A8%D8%A7%D8%A1_%D9%85%D8%B5%D8%B1.png',
  THEME_KEY: 'app-theme',
  getTheme(){ return localStorage.getItem(this.THEME_KEY) || 'light'; },
  setTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(this.THEME_KEY, theme);
    const icon = document.querySelector('#themeIcon');
    if(icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  },
  toggleTheme(){
    const newTheme = this.getTheme() === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    const btn = document.querySelector('#themeToggle');
    if(btn){ btn.style.transform='translateY(6px)'; setTimeout(()=>btn.style.transform='',120); }
  },
  createHeader(options = {}){
    const title = options.title || 'مرحبآ بكــ';
    const subtitle = options.subtitle || 'الكود_البنكى = emptid';
    let header = document.querySelector('.app-header');
    if(header){
      if(!header.querySelector('#themeToggle')){
        const actions = header.querySelector('.app-header__actions');
        const btn = document.createElement('button');
        btn.id = 'themeToggle';
        btn.className = 'btn-3d btn-3d--circle btn-3d--ghost';
        btn.innerHTML = '<span id="themeIcon">🌙</span>';
        btn.onclick = () => this.toggleTheme();
        actions.prepend(btn);
      }
      return;
    }
    header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML = `
      <img src="${this.LOGO}" class="app-header__logo" alt="شعار">
      <div class="app-header__info">
        <div class="app-header__title">${title}</div>
        <div class="app-header__subtitle">${subtitle}</div>
      </div>
      <div class="app-header__actions">
        <button id="themeToggle" class="btn-3d btn-3d--circle btn-3d--ghost" title="ليل/نهار">
          <span id="themeIcon">🌙</span>
        </button>
        <button class="btn-3d btn-3d--sm" onclick="location.href='./index.html'">↩ الصفحة الرئيسية</button>
        <button class="btn-3d btn-3d--sm" onclick="location.href='./index.html'">↩ خروج</button>
      </div>
    `;
    document.body.prepend(header);
    header.querySelector('#themeToggle').onclick = () => this.toggleTheme();
  },
  init(options){
    this.createHeader(options);
    this.setTheme(this.getTheme());
    document.addEventListener('click', e=>{
      const action = e.target.closest('[data-action]')?.dataset.action;
      if(action === 'toggle-theme') this.toggleTheme();
      if(action === 'open-dialog') document.getElementById('dialog')?.classList.add('show');
      if(action === 'close-dialog') document.getElementById('dialog')?.classList.remove('show');
    });
  }
};
document.addEventListener('DOMContentLoaded', ()=> App.init());
window.App = App;
