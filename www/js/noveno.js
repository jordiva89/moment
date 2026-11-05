/* Moment · El Noveno Camino
   La pestaña ⑨: texto, citas y canales.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

let ncCollapsed={};   // {idCaja:true} cajas de El Noveno Camino plegadas
function ncToggle(id){ ncCollapsed[id]=!ncCollapsed[id]; renderFav(); verCaja('[data-nc=\''+id+'\']'); }

function eneagramaSVG(size, color){
  // puntos 1..9 sobre el círculo, con el 9 arriba (ángulo 90°), cada 40°
  const cx=100, cy=100, r=88;
  const pt=i=>{ const a=(90 - i*40) * Math.PI/180; return [cx + r*Math.cos(a), cy - r*Math.sin(a)]; };
  const P={}; for(let i=1;i<=9;i++) P[i]=pt(i);
  const line=(a,b)=>`M${P[a][0].toFixed(1)},${P[a][1].toFixed(1)} L${P[b][0].toFixed(1)},${P[b][1].toFixed(1)}`;
  const tri=[[9,3],[3,6],[6,9]].map(x=>line(x[0],x[1])).join(' ');
  const hex=[[1,4],[4,2],[2,8],[8,5],[5,7],[7,1]].map(x=>line(x[0],x[1])).join(' ');
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" style="display:block;margin:0 auto" aria-label="Eneagrama">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="3"/>
    <path d="${tri}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    <path d="${hex}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}


function ncSocialBlock(){
  // Canales digitales de El Noveno Camino, con logos vectoriales y CTA
  const ic={
    wa:'<svg viewBox="0 0 24 24" width="26" height="26" fill="#25D366"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.4 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.2 2.2-.2 3.9a12 12 0 0 0 4.6 4.2c1.7.8 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2-.1-.1-.2-.1-.6-.2z"/></svg>',
    yt:'<svg viewBox="0 0 24 24" width="26" height="26" fill="#FF0000"><path d="M23 7.2a3 3 0 0 0-2.1-2.2C19 4.5 12 4.5 12 4.5s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .6 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.2c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.2A31 31 0 0 0 23.4 12 31 31 0 0 0 23 7.2zM9.8 15.3V8.7l6 3.3-6 3.3z"/></svg>',
    tg:'<svg viewBox="0 0 24 24" width="26" height="26" fill="#26A5E4"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.9 6.9-1.7 8.1c-.1.6-.5.7-1 .5l-2.6-1.9-1.3 1.2c-.1.1-.3.3-.5.3l.2-2.7 4.9-4.4c.2-.2 0-.3-.3-.1l-6.1 3.8-2.6-.8c-.6-.2-.6-.6.1-.9l10.2-3.9c.5-.2.9.1.7.8z"/></svg>',
    tk:'<svg viewBox="0 0 24 24" width="26" height="26" fill="#010101"><path d="M16.6 5.8a4.3 4.3 0 0 1-1-2.8h-3.1v12.4a2.6 2.6 0 1 1-1.8-2.5V9.7a5.7 5.7 0 1 0 4.9 5.6V9a7.3 7.3 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.3-1.5z"/></svg>',
    web:'<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#5B9E4D" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>'
  };
  const fila=(icono,nombre,url)=>`<a href="${url}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;padding:10px 4px;text-decoration:none;color:inherit">${icono}<span style="font-weight:600">${nombre}</span></a>`;
  return `
    <p class="muted" style="margin-top:0">${t('nc_cta')}</p>
    ${fila(ic.yt,'YouTube','https://www.youtube.com/@elnovenocamino')}
    ${fila(ic.tk,'TikTok','https://www.tiktok.com/@elnovenocamino')}
    ${fila(ic.wa,'WhatsApp','https://www.whatsapp.com/channel/0029VbD4PVV0G0Xj6EVtTC1R')}
    ${fila(ic.tg,'Telegram','https://t.me/elnovenocamino')}
    ${fila(ic.web,'jordibeold.com','https://jordibeold.com/')}`;
}
// Citas de El Noveno Camino (del documento del autor; ES revisado, EN nativo)
function NOVENO_QS(){ return getLang()==='en' ? NOVENO_QS_EN : NOVENO_QS_ES; }
// Texto de presentación de El Noveno Camino (los 9 caminos, la Ley de 3 y el caminante)
function NC_TEXTO(){ return getLang()==='en' ? NC_TEXTO_EN : NC_TEXTO_ES; }
// Caja explicativa: va entre la del eneagrama y la de las citas
function ncTextoBlock(){
  const x=NC_TEXTO();
  const lista=arr=>arr.map(f=>`<li style="margin:0 0 9px"><b>${f[0]}</b>: ${f[1]}</li>`).join('');
  return `
    <p style="margin:0 0 10px;line-height:1.6">${x.intro1}</p>
    <p style="margin:0 0 18px;line-height:1.6">${x.intro2}</p>
    <h3 style="margin:0 0 8px">${x.h_caminos}</h3>
    <ul style="margin:0 0 18px;padding-left:20px;line-height:1.55">${lista(x.caminos)}</ul>
    <h3 style="margin:0 0 8px">${x.h_ley}</h3>
    <p class="muted" style="margin:0 0 8px">${x.ley_intro}</p>
    <ul style="margin:0 0 18px;padding-left:20px;line-height:1.55">${lista(x.ley)}</ul>
    <h3 style="margin:0 0 8px">${x.h_cam}</h3>
    <p style="margin:0 0 10px;line-height:1.6">${x.cam1}</p>
    <p style="margin:0;line-height:1.6">${x.cam2}</p>`;
}
function renderFav(){
  const M=document.getElementById('main');
  const citas=NOVENO_QS();
  M.innerHTML=`
    <div class="card" style="text-align:center;padding:28px 18px 20px">
      ${eneagramaSVG(150, 'var(--verde2)')}
      <h2 style="margin:14px 0 6px;font-size:1.7rem;text-align:center">${t('path_title')}</h2>
      <p class="muted" style="margin:0 0 14px;font-size:1.08rem;text-align:center">${t('path_sub')}</p>
      <img src="${getLang()==='en'?'noveno-en.png':'noveno-es.png'}" alt="" style="width:100%;height:auto;display:block;margin:0 auto">
      <p class="cbtn" style="margin:14px 0 4px"><button type="button" class="tbtn" onclick="document.getElementById('nc_redes').scrollIntoView({behavior:'smooth'})">${t('path_soc_link')}</button></p>
    </div>
    ${botonPlegarTodo('toggleAllNC()', ncCollapsed['texto'] && ncCollapsed['citas'])}
    <div class="card" data-nc="texto">
      <h2 style="margin:0;cursor:pointer" onclick="ncToggle('texto')">«${t('path_title')}» <span class="muted">${ncCollapsed['texto']?'▼':'▲'}</span></h2>
      <div style="${ncCollapsed['texto']?'display:none':'margin-top:12px'}">${ncTextoBlock()}</div>
    </div>
    ${citas.length?`<div class="card" data-nc="citas">
      <h2 style="margin:0;cursor:pointer" onclick="ncToggle('citas')">${t('nc_quotes')} <span class="muted">${ncCollapsed['citas']?'▼':'▲'}</span></h2>
      <div style="${ncCollapsed['citas']?'display:none':'margin-top:14px'}">${citas.map(b=>`
      <div style="margin:0 0 20px">
        ${b.qs.map(q=>`<p style="font-style:italic;line-height:1.6;margin:0 0 10px">«${q}»</p>`).join('')}
        <p style="text-align:right;margin:0"><b>${b.a}</b>${b.c?`<br><span class="muted" style="font-size:.82rem">${b.c}</span>`:''}</p>
      </div>`).join('')}</div>
    </div>`:''}
    <div class="card" id="nc_redes" data-nc="redes">
      <h2 style="margin:0 0 12px">${t('nc_social')}</h2>
      ${ncSocialBlock()}
    </div>`;
}

function toggleAllNC(){
  const secs=['texto','citas'];
  const todoPlegado=secs.every(x=>ncCollapsed[x]);
  secs.forEach(x=>ncCollapsed[x]=!todoPlegado);
  renderFav();
}
