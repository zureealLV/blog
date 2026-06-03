(function(){
  if(sessionStorage.getItem('landing-seen')){var ov=document.getElementById('landing-overlay');if(ov)ov.remove();return;}
  var ov=document.getElementById('landing-overlay');
  if(!ov)return;
  ov.style.display='block';
  var cv=document.getElementById('lo-canvas'),cx=cv.getContext('2d');
  var kana='アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
  var abc='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'+kana;
  var fs=16,cols,drops,spd=[],phase='idle',sy=0,sd=false;

  function rz(){
    cv.width=innerWidth;cv.height=innerHeight;
    cols=Math.floor(cv.width/fs);drops=[];spd=[];
    for(var i=0;i<cols;i++){drops[i]=-Math.random()*20;spd[i]=0.06+Math.random()*0.14;}
  }
  rz();addEventListener('resize',rz);

  function draw(){
    cx.fillStyle='rgba(10,10,10,0.04)';
    cx.fillRect(0,0,cv.width,cv.height);
    cx.fillStyle='#00ff41';
    cx.font=fs+'px monospace';

    if(phase==='sync'){
      sy+=0.12;
      for(var i=0;i<cols;i++){
        var y=sy%(cv.height/fs+10);
        cx.fillText(abc[Math.floor(Math.random()*abc.length)],i*fs,y*fs);
        for(var t=1;t<6;t++){
          var ty=y-t;
          if(ty>=0){
            cx.globalAlpha=1-t*0.16;
            cx.fillText(abc[Math.floor(Math.random()*abc.length)],i*fs,ty*fs);
            cx.globalAlpha=1;
          }
        }
      }
      if(sy*fs>cv.height+fs*10&&!sd){sd=true;phase='random';}
    } else if(phase==='random'){
      for(var i=0;i<drops.length;i++){
        if(Math.random()>0.6)continue;
        cx.fillText(abc[Math.floor(Math.random()*abc.length)],i*fs,drops[i]*fs);
        if(drops[i]*fs>cv.height&&Math.random()>0.99)drops[i]=0;
        drops[i]+=spd[i];
      }
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // Corners
  document.getElementById('lo-pid').textContent=Math.floor(Math.random()*90000+10000);
  document.getElementById('lo-mem').textContent=(Math.random()*2+.5).toFixed(1)+'GB';
  var dt=document.getElementById('lo-dt');
  function ut(){var n=new Date();dt.textContent=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0');}
  ut();setInterval(ut,1000);
  var st=Date.now(),up=document.getElementById('lo-up');
  setInterval(function(){var d=Math.floor((Date.now()-st)/1000);up.textContent=String(Math.floor(d/3600)).padStart(2,'0')+':'+String(Math.floor((d%3600)/60)).padStart(2,'0')+':'+String(d%60).padStart(2,'0');},1000);

  // Binary stream
  var bn=document.getElementById('lo-bin');
  function gb(){var s='';for(var i=0;i<80;i++)s+=Math.random()>.5?'1':'0';bn.textContent=s;}
  gb();setInterval(gb,200);

  // osu! burst effect
  function burst(x,y){
    var b=document.createElement('div');b.className='lo-burst';
    b.textContent=['✦','◆','●','★'][Math.floor(Math.random()*4)];
    b.style.left=(x-15)+'px';b.style.top=(y-15)+'px';
    ov.appendChild(b);setTimeout(function(){b.remove();},500);
    var r=document.createElement('div');r.className='lo-ripple';
    r.style.cssText='left:'+(x-30)+'px;top:'+(y-30)+'px;width:60px;height:60px;';
    ov.appendChild(r);setTimeout(function(){r.remove();},600);
  }

  // osu! hit circle
  function circle(x,y,sz){
    var c=document.createElement('div');c.className='lo-hitcircle';
    c.style.cssText='left:'+(x-sz/2)+'px;top:'+(y-sz/2)+'px;width:'+sz+'px;height:'+sz+'px;';
    ov.appendChild(c);
    var a=sz*2.5;
    var ap=document.createElement('div');ap.className='lo-approach';
    ap.style.cssText='left:'+(x-a/2)+'px;top:'+(y-a/2)+'px;width:'+a+'px;height:'+a+'px;';
    ov.appendChild(ap);
    var t0=performance.now(),dur=1500;
    function anim(now){
      var p=Math.min((now-t0)/dur,1),cur=a-(a-sz)*p;
      ap.style.width=cur+'px';ap.style.height=cur+'px';
      ap.style.left=(x-cur/2)+'px';ap.style.top=(y-cur/2)+'px';
      ap.style.opacity=0.3+p*0.5;c.style.opacity=0.3+p*0.5;
      if(p<1){requestAnimationFrame(anim);}
      else{
        burst(x,y);
        c.style.transition='opacity .3s';c.style.opacity='0';
        ap.style.transition='opacity .3s';ap.style.opacity='0';
        setTimeout(function(){c.remove();ap.remove();},400);
      }
    }
    requestAnimationFrame(anim);
  }

  // osu! slider
  function slider(x1,y1,x2,y2,cpx,cpy){
    var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:13;';
    ov.appendChild(svg);
    var d='M'+x1+','+y1+' Q'+cpx+','+cpy+' '+x2+','+y2;

    var ou=document.createElementNS('http://www.w3.org/2000/svg','path');
    ou.setAttribute('d',d);ou.setAttribute('fill','none');
    ou.setAttribute('stroke','rgba(0,204,255,0.1)');ou.setAttribute('stroke-width','80');
    ou.setAttribute('stroke-linecap','round');svg.appendChild(ou);

    var bd=document.createElementNS('http://www.w3.org/2000/svg','path');
    bd.setAttribute('d',d);bd.setAttribute('fill','none');
    bd.setAttribute('stroke','rgba(0,204,255,0.35)');bd.setAttribute('stroke-width','40');
    bd.setAttribute('stroke-linecap','round');svg.appendChild(bd);

    var inn=document.createElementNS('http://www.w3.org/2000/svg','path');
    inn.setAttribute('d',d);inn.setAttribute('fill','none');
    inn.setAttribute('stroke','rgba(0,204,255,0.15)');inn.setAttribute('stroke-width','60');
    inn.setAttribute('stroke-linecap','round');svg.insertBefore(inn,bd);

    var bl=document.createElement('div');bl.className='lo-slider-ball';ov.appendChild(bl);
    var sc=document.createElement('div');sc.className='lo-hitcircle';
    sc.style.cssText='left:'+(x1-24)+'px;top:'+(y1-24)+'px;width:48px;height:48px;opacity:.6;border-color:#00ccff;border-width:4px;';
    ov.appendChild(sc);
    var ec=document.createElement('div');ec.className='lo-hitcircle';
    ec.style.cssText='left:'+(x2-20)+'px;top:'+(y2-20)+'px;width:40px;height:40px;opacity:.4;border-color:#00ccff;border-width:3px;';
    ov.appendChild(ec);

    var pLen=bd.getTotalLength(),t0=performance.now(),dur=2800;
    svg.style.opacity='0.9';sc.style.opacity='0.6';ec.style.opacity='0.4';bl.style.opacity='1';

    function anim(now){
      var el=(now-t0)%(dur*2),t=el<dur?el/dur:1-(el-dur)/dur;
      var pt=bd.getPointAtLength(t*pLen);
      bl.style.left=(pt.x-14)+'px';bl.style.top=(pt.y-14)+'px';
      if((now-t0)<dur*2.5){requestAnimationFrame(anim);}
      else{
        svg.style.transition='opacity .5s';svg.style.opacity='0';
        bl.style.transition='opacity .5s';bl.style.opacity='0';
        sc.style.transition='opacity .5s';sc.style.opacity='0';
        ec.style.transition='opacity .5s';ec.style.opacity='0';
        setTimeout(function(){svg.remove();bl.remove();sc.remove();ec.remove();},600);
      }
    }
    requestAnimationFrame(anim);
  }

  // Start osu! elements
  function startOsu(){
    var w=innerWidth,h=innerHeight;
    function spC(){circle(120+Math.random()*(w-240),120+Math.random()*(h-240),80+Math.random()*40);}
    function spS(){
      var x1=100+Math.random()*(w-200),y1=100+Math.random()*(h-200);
      var x2=x1+(Math.random()-0.5)*500,y2=y1+(Math.random()-0.5)*400;
      x2=Math.max(60,Math.min(w-60,x2));y2=Math.max(60,Math.min(h-60,y2));
      slider(x1,y1,x2,y2,(x1+x2)/2+(Math.random()-0.5)*350,(y1+y2)/2+(Math.random()-0.5)*300);
    }
    setInterval(function(){if(ov.style.display==='none')return;spC();},3000);
    setTimeout(function(){setInterval(function(){if(ov.style.display==='none')return;spS();},5000);},2000);
  }

  // Click effects (not on center)
  ov.addEventListener('click',function(e){
    if(e.target.closest('#lo-center'))return;
    if(ov.style.display!=='none')burst(e.clientX,e.clientY);
  });

  // Animation sequence
  var c1=document.getElementById('lo-c1'),c2=document.getElementById('lo-c2');
  var c3=document.getElementById('lo-c3'),c4=document.getElementById('lo-c4');
  var ttl=document.getElementById('lo-title'),ent=document.getElementById('lo-enter');

  setTimeout(function(){document.getElementById('lo-cmd').style.opacity='1';},300);
  setTimeout(function(){c1.classList.add('show');},600);
  setTimeout(function(){c2.classList.add('show');},1400);
  setTimeout(function(){c3.classList.add('show');},2200);
  setTimeout(function(){c4.classList.add('show');},3000);
  setTimeout(function(){ttl.classList.add('show');},4000);
  setTimeout(function(){ent.classList.add('show');},4800);
  setTimeout(function(){phase='sync';},5000);
  setTimeout(function(){startOsu();},11000);

  // Enter blog
  var entering=false;
  function enter(){
    if(entering)return;entering=true;
    var bar=document.getElementById('lo-bar'),fill=document.getElementById('lo-fill');
    bar.classList.add('show');
    setTimeout(function(){fill.classList.add('done');},100);
    setTimeout(function(){ov.classList.add('fade-out');},2000);
    setTimeout(function(){sessionStorage.setItem('landing-seen','1');ov.remove();},2800);
  }

  document.getElementById('lo-title').addEventListener('click',enter);
  document.getElementById('lo-enter').addEventListener('click',enter);
  document.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' ')enter();});
})();
