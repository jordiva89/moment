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
function adjTipo(mime){
  return /^image\//.test(mime||'') ? 'image' : /^audio\//.test(mime||'') ? 'audio' : /^video\//.test(mime||'') ? 'video' : null;
}
function adjIcono(tipo){ return tipo==='image' ? '🖼️' : tipo==='audio' ? '🎧' : '🎬'; }
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
  const propio=(p.adj && p.adj.id)
    ? `<div class="adjunto" data-adj="${esc(p.adj.id)}" data-tipo="${esc(p.adj.tipo||'')}"><p class="muted" style="font-size:.85rem;margin:0">${t('adj_loading')}</p></div>` : '';
  return deBiblioteca + propio;
}
function hidratarAdjuntos(){
  document.querySelectorAll('.adjunto[data-adj]:not([data-ok])').forEach(el=>{
    el.setAttribute('data-ok','1');
    const id=el.getAttribute('data-adj'), tipo=el.getAttribute('data-tipo');
    const pinta=url=>{
      el.innerHTML = tipo==='image' ? `<img src="${url}" alt="">`
        : tipo==='audio' ? `<audio controls preload="metadata" src="${url}"></audio>`
        : `<video controls playsinline preload="metadata" src="${url}"></video>`;
    };
    const falta=()=>{ el.innerHTML=`<p class="muted" style="font-size:.85rem;margin:0">${t('adj_missing')}</p>`; };
    if(_adjURL.has(id)){ pinta(_adjURL.get(id)); return; }
    ADJ.leer(id).then(blob=>{
      if(!blob){ falta(); return; }
      const url=URL.createObjectURL(blob); _adjURL.set(id, url); pinta(url);
    }).catch(falta);
  });
}
