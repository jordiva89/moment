/* Moment · Adjuntos
   Audio, imagen o vídeo de las prácticas propias, guardados en el dispositivo (IndexedDB).

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

/* ================== ADJUNTOS ==================
   Audio, imagen o vídeo de una práctica propia (se añaden desde «Momento para ti»).
   El archivo vive en el dispositivo, en IndexedDB, nunca en un servidor. En la
   práctica solo se guarda una ficha pequeña:
     p.adj = {id, tipo:'image'|'audio'|'video', nombre, mime, kb}
   localStorage no sirve para esto: tiene unos 5 MB para toda la app y solo
   guarda texto. IndexedDB guarda el archivo tal cual, sin convertirlo. */
const ADJ_DB='moment-adjuntos', ADJ_ALMACEN='archivos', ADJ_MAX_MB=100;
let _adjDB=null;
function adjAbrir(){
  if(_adjDB) return _adjDB;
  _adjDB=new Promise((res,rej)=>{
    try{
      if(!window.indexedDB) return rej(new Error('sin IndexedDB'));
      const r=indexedDB.open(ADJ_DB, 1);
      r.onupgradeneeded=()=>{ try{ r.result.createObjectStore(ADJ_ALMACEN); }catch(e){} };
      r.onsuccess=()=>res(r.result);
      r.onerror=()=>rej(r.error||new Error('IndexedDB'));
    }catch(e){ rej(e); }
  });
  _adjDB.catch(()=>{ _adjDB=null; });   // si falla, se reintenta la próxima vez
  return _adjDB;
}
function adjOp(modo, fn){
  return adjAbrir().then(db=>new Promise((res,rej)=>{
    const tx=db.transaction(ADJ_ALMACEN, modo), r=fn(tx.objectStore(ADJ_ALMACEN));
    tx.oncomplete=()=>res(r ? r.result : undefined);
    tx.onerror=()=>rej(tx.error); tx.onabort=()=>rej(tx.error);
  }));
}
// Las tres operaciones van en un objeto para poder sustituirlas en las pruebas
// (el entorno de pruebas no tiene IndexedDB).
const ADJ = {
  guardar:(id, blob)=>adjOp('readwrite', st=>st.put(blob, id)),
  leer:id=>adjOp('readonly', st=>st.get(id)),
  borrar:id=>adjOp('readwrite', st=>st.delete(id)),
};
function adjBorrar(id){ adjSoltarURL(id); return ADJ.borrar(id); }
/* Cualquier archivo se puede adjuntar (3.90). Imagen, audio y vídeo se ven o se
   oyen en la ficha; un texto se lee en la ficha; el resto se guarda en el
   dispositivo con un botón. */
const ADJ_TIPOS_OK=['image','audio','video','text','file'];
function adjTipo(mime, nombre){
  const m=mime||'';
  return /^image\//.test(m) ? 'image' : /^audio\//.test(m) ? 'audio' : /^video\//.test(m) ? 'video'
    : (/^text\//.test(m) || /\.(txt|md)$/i.test(nombre||'')) ? 'text' : 'file';
}
function adjIcono(tipo){ return tipo==='image' ? '🖼️' : tipo==='audio' ? '🎧' : tipo==='video' ? '🎬' : tipo==='text' ? '📄' : '📎'; }

/* Archivos que la persona añade a las prácticas de la biblioteca de la app (las que
   no son suyas): {pid: ficha}. Las propias guardan la ficha en p.adj. */
// Se revisa al cargar, como todo lo guardado: solo identificadores y fichas válidas.
let adjLibreria = (function(){
  const g=LS.get('mpt_adjlib', {}), o={};
  if(g && typeof g==='object' && !Array.isArray(g)) Object.keys(g).slice(0, 2000).forEach(pid=>{
    const a=g[pid];
    if(esId(pid) && a && typeof a==='object' && esId(a.id) && ADJ_TIPOS_OK.includes(a.tipo))
      o[pid]={id:a.id, tipo:a.tipo, nombre:texto(a.nombre,200), mime:texto(a.mime,100), kb:entero(a.kb,0,1e7,0)};
  });
  return o;
})();
function adjDe(p){ return p ? (p.adj || adjLibreria[p.id] || null) : null; }
function tamanoTxt(kb){ return kb<1024 ? Math.max(1,kb)+' KB' : (kb/1024).toFixed(1).replace('.0','')+' MB'; }
// Direcciones temporales (blob:) de los adjuntos ya abiertos en esta sesión
const _adjURL=new Map();
function adjSoltarURL(id){ const u=_adjURL.get(id); if(u){ try{ URL.revokeObjectURL(u); }catch(e){} _adjURL.delete(id); } }
// Hueco del adjunto dentro de una ficha. Se rellena solo, en cuanto aparece en
// pantalla (ver hidratarAdjuntos), porque leer el archivo es asíncrono.
function adjuntoHTML(p){
  if(!p) return '';
  // los de la biblioteca (p.adjs) van dentro de la app: se pintan tal cual
  const deBiblioteca=(Array.isArray(p.adjs)?p.adjs:[]).map(a=>{
    const src=esc(a.src);
    return `<div class="adjunto">${a.tipo==='image' ? `<img src="${src}" alt="" loading="lazy">`
      : a.tipo==='audio' ? `<audio controls preload="none" src="${src}"></audio>`
      : `<video controls playsinline preload="none" src="${src}"></video>`}</div>`;
  }).join('');
  // el de una práctica propia vive en IndexedDB: se pinta un hueco y lo rellena hidratarAdjuntos()
  const a=adjDe(p);
  const propio=(a && a.id)
    ? `<div class="adjunto" data-adj="${esc(a.id)}" data-tipo="${esc(a.tipo||'')}" data-nombre="${esc(a.nombre||'')}" data-mime="${esc(a.mime||'')}" data-kb="${Number(a.kb)||0}"><p class="muted" style="font-size:.85rem;margin:0">${t('adj_loading')}</p></div>` : '';
  return deBiblioteca + propio;
}
function hidratarAdjuntos(){
  document.querySelectorAll('.adjunto[data-adj]:not([data-ok])').forEach(el=>{
    el.setAttribute('data-ok','1');
    const id=el.getAttribute('data-adj'), tipo=el.getAttribute('data-tipo');
    const nombre=el.getAttribute('data-nombre')||'', kb=Number(el.getAttribute('data-kb'))||0;
    const pinta=url=>{
      if(tipo==='text'){
        ADJ.leer(id).then(b=>b && b.text ? b.text() : '').then(txt=>{
          el.innerHTML=`<div class="ptext adjtexto">${esc(String(txt).slice(0, 20000))}</div>`;
        }).catch(falta);
        return;
      }
      el.innerHTML = tipo==='image' ? `<img src="${url}" alt="">`
        : tipo==='audio' ? `<audio controls preload="metadata" src="${url}"></audio>`
        : tipo==='video' ? `<video controls playsinline preload="metadata" src="${url}"></video>`
        : `<div class="row" style="align-items:center;gap:8px;flex-wrap:nowrap">
            <div style="flex:1;font-size:.88rem;min-width:0;overflow-wrap:anywhere">📎 <b>${esc(nombre)}</b> · ${tamanoTxt(kb)}</div>
            <button type="button" class="btn ghost small" onclick="guardarAdjunto(${jsAttr(id)})">${t('adj_save_file')}</button></div>`;
    };
    const falta=()=>{ el.innerHTML=`<p class="muted" style="font-size:.85rem;margin:0">${t('adj_missing')}</p>`; };
    if(_adjURL.has(id)){ pinta(_adjURL.get(id)); return; }
    ADJ.leer(id).then(blob=>{
      if(!blob){ falta(); return; }
      const url=URL.createObjectURL(blob); _adjURL.set(id, url); pinta(url);
    }).catch(falta);
  });
}

// Guarda en el dispositivo un adjunto que no se puede ver en la ficha (un PDF, por
// ejemplo): en el móvil, en Descargas; en el navegador, como descarga normal.
async function guardarAdjunto(id){
  const el=document.querySelector('.adjunto[data-adj="'+id+'"]');
  const nombre=(el && el.getAttribute('data-nombre')) || 'adjunto', mime=(el && el.getAttribute('data-mime')) || 'application/octet-stream';
  try{
    const blob=await ADJ.leer(id);
    if(!blob){ toast(t('adj_missing')); return; }
    if(IS_NATIVE && CapAjustes && CapAjustes.guardarDescarga){
      const b64=await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(',')[1]||''); r.onerror=rej; r.readAsDataURL(blob); });
      await CapAjustes.guardarDescarga({nombre, base64:b64, mime});
      toast(t('tr_saved').replace('{f}', nombre)); return;
    }
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(e){} }, 4000);
  }catch(e){ anota('guardar-adjunto', e); toast(t('bk_export_fail')); }
}

/* ---- Adjuntar un archivo a cualquier práctica de la biblioteca ----
   Las propias lo guardan en su ficha (p.adj); las de la app, en adjLibreria. El
   archivo vive en el dispositivo, como el de los momentos propios. */
let _adjPid=null;
function abrirAdjuntoPractica(pid){
  const p=byId(pid); if(!p) return;
  _adjPid=pid;
  _evAdj={actual:adjDe(p), nuevo:null, quitar:false};
  document.getElementById('modalContent').innerHTML=`
    <h3>${t('lib_adj_title')}</h3>
    <p class="muted" style="margin:0 0 8px"><b>${esc(p.title)}</b></p>
    <p class="muted" style="margin:0 0 8px;font-size:.85rem">${t('ef_adj_txt').replace('{n}', ADJ_MAX_MB)}</p>
    <input type="file" id="ev_adj" style="display:none" onchange="evAdjElegir(this.files[0]);this.value=''">
    <div id="ev_adj_info"></div>
    <button type="button" class="btn ghost block" onclick="document.getElementById('ev_adj').click()">${t('ef_adj_btn')}</button>
    <div class="row" style="margin-top:14px">
      <button class="btn primary" style="flex:1" onclick="guardarAdjuntoPractica()">${t('ef_save')}</button>
      <button class="btn ghost" style="flex:1" onclick="closeModal()">${t('ef_cancel')}</button>
    </div>`;
  evAdjPintar();
  openModal();
}
function guardarAdjuntoPractica(){
  const p=byId(_adjPid); if(!p){ closeModal(); return; }
  if(esUserPractice(p.id)){
    const k=userLib.findIndex(u=>u.id===p.id);
    if(k>=0 && evAdjAplicar(userLib[k])){ LS.set('mpt_userlib', userLib); libCacheDirty(); }
  } else {
    const caja={id:p.id, adj:adjLibreria[p.id]};
    if(evAdjAplicar(caja)){
      if(caja.adj) adjLibreria[p.id]=caja.adj; else delete adjLibreria[p.id];
      LS.set('mpt_adjlib', adjLibreria);
    }
  }
  closeModal();
  try{ if(typeof renderLibList==='function' && document.getElementById('liblist')) renderLibList(); }catch(e){}
  try{ hidratarAdjuntos(); }catch(e){}
}
