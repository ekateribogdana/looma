const {chromium}=require('playwright'); const fs=require('fs');
const URL=process.env.URL;
const AUDIT=()=>{ // runs in page on active screen
  const scr=[...document.querySelectorAll('.screen')].find(s=>!s.hidden&&getComputedStyle(s).display!=='none'&&!s.classList.contains('out-push')) || document.body;
  const vis=e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.05};
  const out={screen:scr.id,issues:[]};
  const app=document.getElementById('app'), ar=app.getBoundingClientRect();
  // horizontal overflow
  scr.querySelectorAll('.scroll').forEach(s=>{ if(s.scrollWidth>s.clientWidth+1) out.issues.push(`h-scroll in .scroll ${s.scrollWidth}>${s.clientWidth}`)});
  const lum=c=>{const m=c.match(/[\d.]+/g);if(!m)return null;const [r,g,b,a=1]=m.map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return {L:.2126*f(r)+.7152*f(g)+.0722*f(b),a:+a}};
  const bgL=lum('rgb(15,15,15)').L;
  scr.querySelectorAll('*').forEach(e=>{ if(!vis(e))return; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e);
    // out of app bounds horizontally
    if(r.right>ar.right+1||r.left<ar.left-1){ if(!e.closest('.chips-row,.people-row,.tch-row,.days,svg,.hero,.style-hero,.hero-img,.ob-bg,.story-slide,.state-bg')) out.issues.push(`out-of-bounds <${e.tagName.toLowerCase()} class="${e.className&&e.className.baseVal===undefined?e.className:''}"> ${Math.round(r.left)}-${Math.round(r.right)}`)}
    // text clipping
    if(e.children.length===0&&e.textContent.trim()&&(cs.overflow==='hidden'||cs.textOverflow==='ellipsis')&&e.scrollWidth>e.clientWidth+1&&cs.textOverflow!=='ellipsis') out.issues.push(`text clipped: "${e.textContent.trim().slice(0,30)}"`);
    // tap targets
    if((e.tagName==='BUTTON'||e.tagName==='A')&&!e.closest('.story-tap,.dirs,.daylist')&&(r.height<32||r.width<32)) out.issues.push(`small tap ${Math.round(r.width)}x${Math.round(r.height)}: "${(e.getAttribute('aria-label')||e.textContent).trim().slice(0,24)}"`);
    // contrast for text leafs
    if(e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())){ const c=lum(cs.color); if(c){ let op=1,x=e; while(x&&x!==document.body){op*=+getComputedStyle(x).opacity;x=x.parentElement} const a=c.a*op; const L=a*c.L+(1-a)*bgL; const cr=(Math.max(L,bgL)+.05)/(Math.min(L,bgL)+.05); const fs=parseFloat(cs.fontSize); if(cr<4.5&&!(fs>=18&&cr>=3)&&!e.closest('.ob-bg,.reset-demo')) out.issues.push(`contrast ${cr.toFixed(2)} fs${fs}: "${e.textContent.trim().slice(0,28)}"`); }
      out.fs=(out.fs||new Set()); out.fs.add(cs.fontSize+' '+cs.fontFamily.split(',')[0].replace(/"/g,''));
    }
    // spacing grid (multiples of 4) on paddings/gaps of layout containers
    ['paddingTop','paddingLeft','rowGap','columnGap'].forEach(k=>{const v=parseFloat(cs[k]); if(v>0&&v%2!==0&&e.children.length) (out.odd=out.odd||new Set()).add(k+':'+v)});
  });
  out.fs=out.fs?[...out.fs]:[]; out.odd=out.odd?[...out.odd]:[];
  out.anims=document.getAnimations().length;
  return out; };
(async()=>{
 const b=await chromium.launch({executablePath:process.env.E}); const res=[]; const errs=[];
 for(const [w,h] of [[375,667],[390,844]]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
 p.on('pageerror',e=>errs.push(`${w}: PAGEERR ${e.message}`)); p.on('console',m=>{if(m.type()==='error'&&!/ERR_FILE_NOT_FOUND/.test(m.text()))errs.push(`${w}: CONSOLE ${m.text()}`)});
 await p.goto(URL); await p.waitForTimeout(1500);
 const clk=async sel=>{const l=p.locator(sel).filter({visible:true}).first(); await l.click({timeout:4000}); await p.waitForTimeout(700)};
 const audit=async label=>{await p.waitForTimeout(500); const a=await p.evaluate(AUDIT); a.label=label; a.vp=`${w}x${h}`; res.push(a); await p.screenshot({path:`shots/qa-${w}-${label}.png`})};
 const step=async(label,fn)=>{try{await fn();await audit(label)}catch(e){errs.push(`${w} ${label}: STEP FAIL ${e.message.split('\n')[0]}`)}};
 await step('ob-splash',async()=>{});
 await step('ob-role',()=>clk('[data-ob-next]'));
 await step('ob-intro',()=>clk('#ob-2 [data-ob-next]'));
 await step('ob-vibe',()=>clk('#ob-3 [data-ob-next]'));
 await step('ob-dirs',()=>clk('#ob-v [data-ob-next]'));
 await step('ob-dirs-disabled',async()=>{if(!(await p.locator('#dirs-next').isDisabled()))throw new Error('Продолжить should be disabled with no styles')});
 await step('ob-reg',async()=>{await clk('#ob-4 [data-dir="Frame Up"]');if(await p.locator('#dirs-next').isDisabled())throw new Error('still disabled');await clk('#ob-4 [data-ob-next]')});
 await step('ob-reg-error',async()=>{await p.fill('#ob-email','');await p.fill('#ob-pass','');await clk('[data-ob-finish]')});
 await step('home',async()=>{await p.fill('#ob-email','a@b.ru');await p.fill('#ob-pass','12345678');await clk('[data-ob-finish]')});
 await step('story-dancer',async()=>{await p.waitForTimeout(1200);await clk('#people-row .pav.has-story');if((await p.locator('#story-prog i').count())!==3)throw new Error('alina story should have 3 slides');if(!(await p.locator('#story-name').textContent()).includes('Алина'))throw new Error('story is not Alina')});
 await step('story-dancer-seen',async()=>{await clk('[data-story-close]');await p.waitForTimeout(500);if(!(await p.locator('#people-row .pav.story-seen').count()))throw new Error('seen missing')});
 await step('people',()=>clk('#s-home [data-section=s-people]'));
 await step('classes',()=>clk('#s-people [data-section-chips] [data-section=s-classes]'));
 await step('classes-weekend',async()=>{const n=await p.locator('#days-classes .day').count();if(n<14)throw new Error('strip has '+n+' days');if(await p.locator('#days-classes .arr').count())throw new Error('arrows still there');await p.locator('#days-classes .daylist').evaluate(e=>e.scrollTo(400,0));await clk('#days-classes [data-day="2026-06-20"]');if(!(await p.locator('#days-classes [data-day="2026-06-20"]').getAttribute('class')).includes('on'))throw new Error('sat not selected')});
 await step('classes-today',()=>clk('#days-classes [data-day="2026-06-12"]'));
 await step('events',()=>clk('#s-classes [data-section-chips] [data-section=s-events]'));
 await step('styles',()=>clk('#s-events [data-section-chips] [data-section=s-styles]'));
 await step('chips-in-place',async()=>{const y0=await p.locator('#s-styles [data-section-chips]').boundingBox();await p.locator('#s-styles [data-section-chips] [data-section=s-people]').click();const st=await p.evaluate(()=>({styles:document.getElementById('s-styles').hidden,people:document.getElementById('s-people').hidden,anim:[...document.querySelectorAll('.screen')].some(s=>/\b(in|out)-/.test(s.className))}));const y1=await p.locator('#s-people [data-section-chips]').boundingBox();if(!st.styles||st.people||st.anim)throw new Error('not instant '+JSON.stringify(st));if(Math.abs(y0.y-y1.y)>1)throw new Error('chips moved '+y0.y+'->'+y1.y);await p.locator('#s-people [data-section-chips] [data-section=s-styles]').click()});
 await step('style',()=>clk('#styles-list [data-style]'));
 await step('lesson-card',async()=>{await clk('#s-style [data-back]');await clk('#s-styles [data-section-chips] [data-section=s-classes]');await clk('#classes-list [data-class=c14]')});
 await step('enrolled',async()=>{await p.locator('#s-lesson-card .scroll').evaluate(e=>e.scrollTo(0,9999));await clk('#lc-enroll')});
 await step('records',()=>clk('[data-my-lessons]'));
 await step('event',async()=>{await clk('[data-tabbar] [data-nav=s-home]');await clk('#home-event .ecard')});
 await step('event-org',async()=>{await p.locator('#s-event .scroll').evaluate(e=>e.scrollTo(0,9999));await clk('#ev-buy')});
 await step('filters',async()=>{await p.evaluate(()=>{const n=document.getElementById('notif');if(n)n.hidden=true});await clk('[data-confirm-no]');await clk('[data-tabbar] [data-nav=s-home]');await clk('#s-home [data-filters]')});
 await step('search',async()=>{await p.keyboard.press('Escape');await p.waitForTimeout(400);await clk('#s-home [data-search]');await p.fill('#search-q','frame')});
 await step('search-empty',async()=>{await p.fill('#search-q','qqqq')});
 await step('links-empty',async()=>{await p.keyboard.press('Escape');await p.waitForTimeout(400);await clk('[data-tabbar] [data-nav=s-links]')});
 await step('person',async()=>{await clk('#s-links .pagehead [data-section=s-people]');await clk('#people-list [data-person]')});
 await step('request',()=>clk('#pp-action'));
 await step('profile-own',async()=>{await clk('[data-cancel-request]');await clk('[data-tabbar] [data-nav=profile]')});
 await step('offline',()=>clk('[data-offline-demo]'));
 await step('teacher-profile',async()=>{await clk('[data-retry]').catch(()=>{});await p.evaluate(()=>document.getElementById('offline').hidden=true);await clk('#pp-switch')});
 await step('lessons',()=>clk('[data-tabbar] [data-nav=second]'));
 await step('lesson',()=>clk('#list [data-open]'));
 await step('roster',()=>clk('#s-lesson [data-roster]'));
 await step('roster-back',async()=>{await clk('#s-roster [data-back]');if(await p.locator('#s-lesson').isHidden())throw new Error('back did not return to lesson')});
 await step('cancel-sheet',()=>clk('[data-cancel-ask]'));
 await step('home-teacher',async()=>{await clk('[data-buy-close]');await p.waitForTimeout(300);await clk('#s-lesson [data-back]');await clk('[data-tabbar] [data-nav=s-home]');await p.waitForTimeout(1200)});
 await step('story',async()=>{if(await p.locator('#people-row .pav.has-story').count())throw new Error('teacher should see no story ring (Alina is me)')});
 await step('form',async()=>{await clk('[data-tabbar] [data-nav=second]');await clk('#s-lessons [data-new-lesson]')});
 await step('form-errors',async()=>{await p.fill('#f-price','');await p.fill('#f-cap','0');await clk('#form button[type=submit]')});
 // motion checks
 if(w===390){ const m=await p.evaluate(()=>({reduceMQ:matchMedia('(prefers-reduced-motion: reduce)').matches})); res.push({label:'motion-info',...m}); }
 await p.close(); }
 // reduced motion
 const pr=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}); await pr.goto(URL); await pr.waitForTimeout(800);
 const rm=await pr.evaluate(()=>getComputedStyle(document.querySelector('.splash-logo img')).animationDuration); res.push({label:'reduced-motion splash anim duration',value:rm}); await pr.close();
 await b.close(); fs.writeFileSync('qa.json',JSON.stringify({res,errs},null,1)); console.log('errors:',errs.length);
})();
