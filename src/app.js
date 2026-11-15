import { flightChapters, flightDuration } from './river-flight.js';

const play = document.querySelector('#play');
const playShape = document.querySelector('#play-shape');
const fullscreen = document.querySelector('#fullscreen');
const viewer = document.querySelector('#viewer');
const scrub = document.querySelector('#scrub');
const timer = document.querySelector('#timer');
const shotName = document.querySelector('#shot-name');
const status = document.querySelector('#status');
const chapters = Array.from(document.querySelectorAll('nav button'));
const canvas = document.querySelector('#gl');
const watchTab = document.querySelector('#watch-tab');
const flightTab = document.querySelector('#flight-tab');
const exploreTab = document.querySelector('#explore-tab');
const exploreControls = document.querySelector('#explore-controls');
const track = document.querySelector('.track');
const chapterNav = document.querySelector('nav');
const flightNav = document.querySelector('#flight-chapters');
const where = document.querySelector('#where');

if (!document.fullscreenEnabled) fullscreen.hidden = true;
fullscreen.addEventListener('click', async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await viewer.requestFullscreen();
});
document.addEventListener('fullscreenchange', () => {
  const label = document.fullscreenElement ? '退出全屏' : '全屏';
  fullscreen.setAttribute('aria-label', label);
  fullscreen.title = label;
});

try {
  const [{renderScene,renderFlight,renderExplore,district,duration},{setupExplore}] = await Promise.all([
    import('./scene.js'), import('./explore.js')
  ]);
  const explore = setupExplore(canvas,exploreControls,district,renderExplore);
  const flightButtons=flightChapters.map(([ms,label])=>{
    const button=document.createElement('button');
    button.type='button';
    button.textContent=label;
    button.addEventListener('click',()=>{setPlaying(false);seek(ms);});
    flightNav.append(button);
    return button;
  });
  let view='watch', time=0;
  const savedTime={watch:0,flight:0};
  let playing = false;
  let lastDraw = 0;
  let startTime = 0;
  let frame;
  const total=()=>view==='flight' ? flightDuration : duration;
  const shortTime=ms=>[Math.floor(ms/60000),Math.floor(ms/1000)%60].map(n=>String(n).padStart(2,'0')).join(':');

  function seek(ms) {
    time=Math.max(0,Math.min(total(),ms));
    let phase;
    if(view==='flight') {
      renderFlight(time);
      const chapter=flightChapters.findLastIndex(([start])=>start<=time);
      phase=flightChapters[chapter][1];
      flightButtons.forEach((button,index)=>button.setAttribute('aria-pressed',String(chapter===index)));
    } else {
      renderScene(time);
      const chapter=time<1250||time>=11250 ? 0 : time<4750 ? 1 : time<6600 ? 2 : 3;
      phase=time>=8550&&time<11250 ? '拉远 · 回到插画' : [
        '长焦 · 夜景插画','推近 · 戴家巷屋檐','抬升 · 洪崖洞','广角 · 嘉陵江与千厮门大桥'
      ][chapter];
      chapters.forEach((button,index)=>button.setAttribute('aria-pressed',String(chapter===index)));
    }
    scrub.value=time;
    timer.value=shortTime(time)+' / '+shortTime(total());
    shotName.textContent = phase;
    scrub.setAttribute('aria-valuetext', shortTime(time) + '，' + phase);
  }
  function animate(now) {
    if (!playing) return;
    if (now - lastDraw >= 1000/30) {
      const elapsed=Math.max(0,now-startTime);
      if(view==='flight' && elapsed>=total()){
        seek(total());
        setPlaying(false);
        return;
      }
      seek(elapsed%total());
      lastDraw = now;
    }
    frame = requestAnimationFrame(animate);
  }
  function setPlaying(next) {
    playing = next;
    cancelAnimationFrame(frame);
    play.setAttribute('aria-label', playing ? '暂停' : '播放');
    playShape.setAttribute('d', playing ? 'M7 5h4v14H7zm6 0h4v14h-4z' : 'M8 5v14l11-7z');
    if (playing) {
      startTime = performance.now() - (time >= total() ? 0 : time);
      lastDraw = 0;
      frame = requestAnimationFrame(animate);
    }
  }
  function switchView(next,place) {
    if(view===next) return;
    if(view!=='explore') savedTime[view]=time;
    setPlaying(false);
    explore.stop();
    view=next;
    const free=view==='explore';
    document.body.dataset.view=view;
    watchTab.setAttribute('aria-pressed',String(view==='watch'));
    flightTab.setAttribute('aria-pressed',String(view==='flight'));
    exploreTab.setAttribute('aria-pressed',String(free));
    play.hidden=track.hidden=free;
    chapterNav.hidden=view!=='watch';
    flightNav.hidden=view!=='flight';
    exploreControls.hidden=!free;
    where.hidden=!free;
    if(free) explore.start(place);
    else {
      scrub.max=total();
      seek(savedTime[view]);
    }
  }

  seek(0);
  document.body.dataset.view='watch';
  status.hidden = true;
  [play,scrub,watchTab,flightTab,exploreTab,...chapters].forEach(control => control.disabled = false);
  watchTab.addEventListener('click',()=>switchView('watch'));
  flightTab.addEventListener('click',()=>switchView('flight'));
  exploreTab.addEventListener('click',()=>switchView('explore'));
  play.addEventListener('click',()=>setPlaying(!playing));
  scrub.addEventListener('input',()=>{
    setPlaying(false);
    seek(Number(scrub.value));
  });
  chapters.forEach(button => button.addEventListener('click',()=>{
    setPlaying(false);
    seek(Number(button.dataset.time));
  }));
  canvas.addEventListener('webglcontextlost',()=>{
    setPlaying(false);
    explore.stop();
  });
  const query=new URLSearchParams(location.search);
  if(query.has('flight')) switchView('flight');
  else if(query.has('explore')) switchView('explore',query.get('place'));
  else if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(true);
} catch (error) {
  status.textContent = '三维场景未能载入。请用支持 WebGL 2 的浏览器打开，或刷新重试。';
  console.error(error);
}
