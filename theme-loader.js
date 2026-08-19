// theme-loader.js - يطبق الثيم الموحد على كل الصفحات
(function(){
  const DEFAULTS = {
    bgMain: '#020a05',
    bgGradientFrom: 'rgba(16,185,129,0.15)',
    bgGradientTo: 'transparent',
    bgImage: '',
    bgOpacity: 1,
    textMain: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.6)',
    fontFamily: 'Cairo',
    fontSize: '14px',
    fontWeight: '600',
    cardBg: 'rgba(255,255,255,0.06)',
    cardBorder: 'rgba(255,255,255,0.1)',
    cardBlur: '12px',
    cardRadius: '16px',
    shadow: '0.8'
  };
  function loadTheme(){
    try{
      const saved = JSON.parse(localStorage.getItem('global_theme_settings')||'{}');
      return {...DEFAULTS, ...saved};
    }catch{ return DEFAULTS; }
  }
  function applyTheme(t){
    const root = document.documentElement;
    root.style.setProperty('--bg-main', t.bgMain);
    root.style.setProperty('--text-main', t.textMain);
    root.style.setProperty('--text-secondary', t.textSecondary);
    root.style.setProperty('--font-family', t.fontFamily);
    root.style.setProperty('--font-size', t.fontSize);
    root.style.setProperty('--card-bg', t.cardBg);
    root.style.setProperty('--card-border', t.cardBorder);
    root.style.setProperty('--card-radius', t.cardRadius);
    const style = document.getElementById('global-theme-style') || document.createElement('style');
    style.id = 'global-theme-style';
    style.innerHTML = `
      body{ background:${t.bgImage?`url(${t.bgImage})`:t.bgMain} !important; background-image:${t.bgImage?`url(${t.bgImage})`: `radial-gradient(800px 400px at 50% 0%, ${t.bgGradientFrom}, ${t.bgGradientTo}), linear-gradient(${t.bgMain},${t.bgMain})`} !important; color:${t.textMain} !important; font-family:${t.fontFamily},Cairo,Tahoma !important; font-size:${t.fontSize} !important; font-weight:${t.fontWeight} !important; }
      .card, [class*="bg-white"], [class*="bg-[rgba"], .glass{ background:${t.cardBg} !important; border-color:${t.cardBorder} !important; border-radius:${t.cardRadius} !important; backdrop-filter:blur(${t.cardBlur}) !important; box-shadow:0 20px 60px rgba(0,0,0,${t.shadow}) !important; }
      *{ font-family:${t.fontFamily},Cairo,Tahoma !important; }
    `;
    if(!document.getElementById('global-theme-style')) document.head.appendChild(style);
  }
  const theme = loadTheme();
  applyTheme(theme);
  window.addEventListener('storage', (e)=>{ if(e.key==='global_theme_settings') applyTheme(loadTheme()); });
  window.applyGlobalTheme = applyTheme;
  console.log('🎨 theme-loader مفعّل', theme);
})();
