// Run with NODE_PATH pointing to a Playwright installation; Vite must be running.
// This fixture never ships in production and neither requests nor synthesizes music.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  fs.mkdirSync('.qa', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = [];
  try {
    for (const mobile of [false, true]) {
      const name = mobile ? 'mobile' : 'desktop';
      const context = await browser.newContext({ viewport: mobile ? {width:390,height:844} : {width:1280,height:720}, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
      const page = await context.newPage();
      await page.addInitScript(() => { const Original = window.WebSocket; window.WebSocket = class extends Original { addEventListener(type, listener, options) { if(type !== 'message') super.addEventListener(type, listener, options); } }; });
      page.setDefaultTimeout(120000);
      const errors = [];
      const mediaRequests = [];
      page.on('pageerror', e => { errors.push(e.message); console.log(name, e.message); });
      page.on('request', r => { if (r.resourceType() === 'media') mediaRequests.push(r.url()); });
      const url = 'http://127.0.0.1:5173/?skipIntro=true&quality=low&debugSpeed=3';
      console.log(name, 'loading');
      await page.goto(url);
      await page.waitForFunction(() => window.__PETAL_HEART_APP__?.stateMachine.state === 'GEM_IDLE');
      await page.evaluate(() => {
        const app = window.__PETAL_HEART_APP__;
        window.qaScene = app.scene;
        window.qaMesh = app.petalSystem.mesh;
        window.qaStates = [];
        app.onStateEnter = state => window.qaStates.push(state);
      });
      const clickGem = async () => {
        const point = await page.evaluate(() => {
          const app = window.__PETAL_HEART_APP__;
          const p = app.gemSystem.group.position.clone().project(app.camera);
          return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};
        });
        if (mobile) await page.touchscreen.tap(point.x,point.y);
        else await page.mouse.click(point.x,point.y);
      };
      await clickGem();
      await page.waitForFunction(() => window.__PETAL_HEART_APP__.stateMachine.state === 'FINAL');
      assert.deepEqual(await page.evaluate(() => qaStates), ['GEM_ACTIVATION','MUSIC_REVEAL','FINAL']);
      assert.equal(await page.evaluate(() => {
        const a=window.__PETAL_HEART_APP__;
        a.onGemInteracted(); a.replay();
        return a.stateMachine.state==='FINAL' && !a.gemSystem.outerMesh.visible && a.scene===qaScene && a.petalSystem.mesh===qaMesh && !a.gemSystem.gemBurst.active && a.musicSystem.audio===null;
      }), true);
      await page.screenshot({ path: `.qa/${name}-final.png` });
      // Reload: install a test-only media clock before the actual gem interaction.
      await page.goto(url + '&jumpState=GEM_IDLE');
      await page.waitForFunction(() => window.__PETAL_HEART_APP__?.stateMachine.state === 'GEM_IDLE');
      await page.evaluate(async () => {
        const {MusicSystem}=await import('/src/music/MusicSystem.js');
        const {CaptionRenderer}=await import('/src/captions/CaptionRenderer.js');
        class ClockMedia extends EventTarget {
          currentTime=0; duration=30; readyState=1; paused=true; ended=false; plays=0;
          play(){ this.plays++; this.paused=false; return Promise.resolve(); }
          pause(){ this.paused=true; } load(){} removeAttribute(){}
        }
        const node=()=>({connect(){},disconnect(){}});
        const ctx={currentTime:0,destination:{},createMediaElementSource:node,createGain:()=>({...node(),gain:{value:0,setValueAtTime(v){this.value=v;},cancelScheduledValues(){},linearRampToValueAtTime(v){this.value=v;}}})};
        const app=window.__PETAL_HEART_APP__;
        app.musicSystem.dispose(); app.captionRenderer.dispose();
        window.qaAudio=new ClockMedia();
        app.musicSystem=new MusicSystem({src:'fixture-only',startTime:10,endTime:20,volume:0.4},{createAudio:()=>qaAudio,getContext:()=>ctx});
        app.captionRenderer=new CaptionRenderer(app.container,{captionFade:0.5,captions:[{start:11,end:14,text:'In every quiet moment,'},{start:14,end:19,text:'my heart finds its way to you.'}]});
        window.qaScene=app.scene; window.qaMesh=app.petalSystem.mesh;
        window.qaFrames=[]; window.qaLastFrame=null;
        const frame=now=>{ if(qaLastFrame!==null)qaFrames.push(now-qaLastFrame);qaLastFrame=now;if(qaFrames.length<60)requestAnimationFrame(frame); };
        requestAnimationFrame(frame);
      });
      await clickGem();
      await page.waitForFunction(() => window.__PETAL_HEART_APP__.musicSystem.status==='playing');
      assert.equal(await page.evaluate(()=>qaAudio.currentTime),10);
      const opacities=async time=>{
        await page.evaluate(t=>{qaAudio.currentTime=t;},time);
        await page.waitForFunction(t=> {
          const app=window.__PETAL_HEART_APP__;
          return app.captionRenderer.nodes.every((node,i)=>Math.abs(Number(node.style.opacity)-app.captionRenderer.timeline.opacity(i,t))<1e-5);
        },time);
        return page.locator('.music-caption').evaluateAll(nodes=>nodes.map(n=>Number(n.style.opacity)));
      };
      assert.deepEqual(await opacities(10),[0,0]);
      assert.deepEqual(await opacities(11.25),[0.5,0]);
      assert.deepEqual(await opacities(12),[1,0]);
      await page.screenshot({path:`.qa/${name}-caption.png`});
      assert.deepEqual(await opacities(14),[0,0]);
      assert.deepEqual(await opacities(16),[0,1]);
      assert.deepEqual(await opacities(12),[1,0]);
      assert.equal(await page.evaluate(()=>{
        const a=window.__PETAL_HEART_APP__;
        a.handlePause(); const paused=qaAudio.paused; a.handleResume();
        return paused;
      }),true);
      await page.waitForFunction(()=>window.__PETAL_HEART_APP__.musicSystem.status==='playing');
      assert.equal(await page.evaluate(()=>qaAudio.currentTime),12);
      await page.setViewportSize(mobile ? {width:844,height:390} : {width:1000,height:720});
      assert.equal(await page.locator('.music-caption').first().evaluate(el=>el.getBoundingClientRect().width<=innerWidth),true);
      await opacities(19);
      await page.evaluate(()=>{qaAudio.currentTime=20.1;});
      await page.waitForFunction(()=>window.__PETAL_HEART_APP__.stateMachine.state==='FINAL');
      assert.equal(await page.evaluate(()=>qaAudio.paused),true);
      assert.equal(await page.evaluate(()=>{
        const a=window.__PETAL_HEART_APP__;
        a.onGemInteracted(); a.replay();
        return a.stateMachine.state==='FINAL' && a.scene===qaScene && a.petalSystem.mesh===qaMesh;
      }),true);
      assert.deepEqual(errors,[]);
      assert.deepEqual(mediaRequests,[]);
      const metrics=await page.evaluate(()=>({frames:qaFrames.length,maxFrameMs:Math.max(...qaFrames),captions:document.querySelectorAll('.music-captions').length,plays:qaAudio.plays}));
      await page.evaluate(()=>window.__PETAL_HEART_APP__.dispose());
      assert.equal(await page.locator('.music-captions').count(),0);
      report.push({name,result:'PASS',errors,mediaRequests,...metrics});
      await context.close();
      console.log(JSON.stringify(report.at(-1)));
    }
    fs.writeFileSync('.qa/browser-report.json',JSON.stringify(report,null,2));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});


