/* Moment · Archivos
   Importar y exportar: copias de seguridad, prácticas en Word o texto, plantillas y archivos encontrados en Descargas.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

/* Importar desde un archivo elegido por la persona. */
/* ---- Reconocimiento automático del tipo de archivo ----
   La app maneja varios formatos: copias de seguridad, idiomas, prácticas en texto
   o Word. En vez de obligar a acertar con el botón, se mira el contenido y se
   encamina solo: así un archivo de Moment se importa desde cualquier sitio. */
function tipoDeArchivo(texto, nombre){
  const n=(nombre||'').toLowerCase();
  if(/\.docx$/.test(n)) return 'docx';
  let d=null;
  try{ d=JSON.parse(texto); }catch(e){ d=null; }
  if(d && typeof d==='object'){
    if(d.app==='momento-para-ti' || d.app==='moment' || d.data) return 'copia';
    if(d.codigo && (d.interfaz || d.practicas)) return 'idioma';
    if(Array.isArray(d) && d.length && d[0] && d[0].title) return 'practicas';
    if(Array.isArray(d.practicas)) return 'practicas';
    return 'json-desconocido';
  }
  if(/^\s*(t[ií]tulo|title)\s*:/im.test(texto)) return 'practicas';
  return 'desconocido';
}
/* ---- Archivos de Moment encontrados en el móvil ----
   Busca en la carpeta Descargas los archivos que la app sabe usar y los ofrece
   para importar con un toque, sin tener que buscarlos a mano. Solo lee archivos
   pequeños cuyo nombre encaja: no rastrea el teléfono. */
let archivosDetectados = [];
async function buscarArchivosMoment(){
  archivosDetectados = [];
  try{
    if(!CapAjustes || !CapAjustes.listarArchivosMoment) return [];
    const r = await CapAjustes.listarArchivosMoment();
    (r && r.archivos || []).forEach(a=>{
      let texto='';
      try{ texto = decodeURIComponent(escape(atob(a.base64))); }catch(e){ return; }
      const tipo = tipoDeArchivo(texto, a.nombre);
      if(tipo==='copia' || tipo==='idioma' || tipo==='practicas')
        archivosDetectados.push({nombre:a.nombre, fecha:a.fecha, tipo, texto});
    });
  }catch(e){ anota('buscar-archivos', e); }
  return archivosDetectados;
}
// (el parámetro se llamaba «t» y tapaba la función de traducción: la lista de
// archivos encontrados fallaba al pintarse)
function nombreTipo(tipo){
  return tipo==='copia' ? t('im_t_copia') : tipo==='idioma' ? t('im_t_idioma') : t('im_t_practicas');
}
async function renderDetectados(){
  const el=document.getElementById('detectados'); if(!el) return;
  el.innerHTML = `<p class="muted" style="font-size:.85rem">${t('im_scanning')}</p>`;
  const lista = await buscarArchivosMoment();
  if(!lista.length){ el.innerHTML = `<p class="muted" style="font-size:.85rem">${t('im_none')}</p>`; return; }
  el.innerHTML = lista.map((a,i)=>`<div class="row" style="align-items:center;margin:0 0 6px">
    <div style="flex:1">
      <b style="font-size:.9rem">${esc(a.nombre)}</b><br>
      <span class="muted" style="font-size:.78rem">${esc(nombreTipo(a.tipo))}</span>
    </div>
    <button class="btn small ghost" onclick="importarDetectado(${i})">${t('im_use')}</button>
  </div>`).join('');
}
function importarDetectado(i){
  const a = archivosDetectados[i]; if(!a) return;
  if(a.tipo==='idioma') aplicarIdiomaTexto(a.texto);
  else importarDatosTexto(a.texto);
}

/* Punto único de importación: acepta cualquier archivo de Moment. */
// Ningún archivo de Moment se acerca a este tamaño; uno mayor colgaría la app
const IMPORT_MAX_MB = 15;
function importarArchivo(file){
  if(!file) return;
  if(file.size>IMPORT_MAX_MB*1024*1024){ toast(t('adj_too_big').replace('{n}', IMPORT_MAX_MB)); return; }
  const r=new FileReader();
  r.onerror=()=>toast(t('bk_read_fail'));
  r.onload=()=>{
    const texto=String(r.result||'');
    const tipo=tipoDeArchivo(texto, file.name);
    if(tipo==='idioma'){ aplicarIdiomaTexto(texto); return; }
    if(tipo==='copia' || tipo==='practicas'){ importarDatosTexto(texto); return; }
    toast(t('im_unknown'));
    anota('importar', new Error('tipo no reconocido: '+tipo));
  };
  r.readAsText(file);
}

// Guarda un archivo de texto: en el móvil, en Descargas (o con el menú de
// compartir si no se puede); en el navegador, como descarga normal.
async function descargarTexto(nombre, texto, mime){
  try{
    if(IS_NATIVE){
      const b64=btoa(unescape(encodeURIComponent(texto)));
      if(CapAjustes && CapAjustes.guardarDescarga){
        try{ await CapAjustes.guardarDescarga({nombre, base64:b64, mime}); toast(t('tr_saved').replace('{f}', nombre)); return true; }catch(e){}
      }
      if(CapAjustes && CapAjustes.compartirArchivo){
        try{ await CapAjustes.compartirArchivo({nombre, base64:b64, mime, titulo:nombre}); return true; }catch(e){}
      }
      toast(t('bk_export_fail')); return false;
    }
    const url=URL.createObjectURL(new Blob([texto], {type:mime+';charset=utf-8'}));
    const a=document.createElement('a'); a.href=url; a.download=nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(e){} }, 4000);
    return true;
  }catch(e){ anota('descargar-texto', e); toast(t('bk_export_fail')); return false; }
}

// Formato amigable: cada práctica empieza con «Título:»; «Categoría:» y «Enlace:» son
// opcionales; «Texto:» puede continuar en varias líneas hasta una línea en blanco.
/* ---- Prefijos que reconoce el lector de plantillas ----
   Antes estaban fijos en español e inglés: una plantilla rellenada en otro idioma
   no se leía y la app decía «no se encontraron prácticas». Ahora los prefijos se
   sacan de TODOS los idiomas cargados —incluidos los importados—, usando las
   mismas claves con las que se genera la plantilla (fmt_title, fmt_cat…). */
let _prefijos = null;
function prefijosCampos(){
  if(_prefijos) return _prefijos;
  const base = {
    titulo: ['t[ií]tulo','title'],
    cat:    ['categor[ií]a','category','cat'],
    texto:  ['texto','text'],
    enlace: ['enlace','link','url'],
  };
  try{
    const claves = {titulo:'fmt_title', cat:'fmt_cat', texto:'fmt_text', enlace:'fmt_link'};
    Object.keys(I18N).forEach(lang=>{
      Object.entries(claves).forEach(([campo, clave])=>{
        const v = I18N[lang] && I18N[lang][clave];
        if(!v) return;
        const p = String(v).replace(/\s*:\s*$/,'').trim();
        if(p && !base[campo].includes(p)) base[campo].push(p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
      });
    });
  }catch(e){ anota('prefijos-plantilla', e); }
  _prefijos = base;
  return base;
}

function esCampo(campo, leido){
  const norm = x => String(x).toLowerCase().replace(/\\/g,'').replace(/[\[\]]/g,'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const k = norm(leido);
  return prefijosCampos()[campo].some(p => {
    const s = norm(p);
    // los de la lista base son expresiones (t[ií]tulo): se prueban como tal
    try{ return new RegExp('^(?:'+p+')$','i').test(leido) || s===k; }catch(e){ return s===k; }
  });
}
function rePrefijos(){
  const p = prefijosCampos();
  const todos = [].concat(p.titulo, p.cat, p.texto, p.enlace).join('|');
  return new RegExp('^\\s*(' + todos + ')\\s*:\\s*(.*)$', 'i');
}
/* Al añadir un idioma, los prefijos se recalculan. */
function olvidarPrefijos(){ _prefijos = null; }
function parseFriendlyPracticas(txt){
  const out=[]; let cur=null, modo=null;
  txt.split(/\r?\n/).forEach(l=>{
    // Se aceptan las etiquetas en los dos idiomas y sus abreviaturas. «category»
    // faltaba: la plantilla en inglés la usa y sus categorías se perdían al importar.
    const m=l.match(rePrefijos());
    if(m){
      const k=m[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      const v=m[2].trim(); modo=null;
      if(esCampo('titulo', k)){ if(cur) out.push(cur); cur={title:v}; }
      else if(!cur){ /* claves antes del primer Título: se ignoran (instrucciones) */ }
      else if(esCampo('cat', k)){ cur.cat=v; }
      else if(esCampo('enlace', k)){ cur.link=v; }
      else { cur.text=v; modo='text'; }
    }
    else if(cur && modo==='text'){
      if(l.trim()==='') modo=null;
      else cur.text=(cur.text?cur.text+'\n':'')+l.trim();
    }
  });
  if(cur) out.push(cur);
  return out.filter(p=>p.title && (p.text||p.link));
}
/* ---- Lector de ZIP, sin dependencias ----
   Lee el índice del ZIP (que está al final) y, de cada archivo, solo sus bytes,
   con Blob.slice: un ZIP de cientos de MB no se carga entero en memoria.
   Admite archivos sin comprimir (método 0) o con deflate (8), que es lo que usan
   Windows, macOS, Android y cualquier compresor. No admite ZIP cifrados ni ZIP64
   (más de 65.535 archivos o más de 4 GB). Lo usan los .docx (que son ZIP) y la
   importación de archivos para varias prácticas. */
const ZIP_MAX_ENTRADAS=2000;
// Windows guarda los nombres con tildes en la página de códigos del sistema (la 850
// en España) cuando no los marca como UTF-8. Bytes 0x80–0xFF de esa página:
const CP850_ALTO='ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´\u00AD±‗¾¶§÷¸°¨·¹³²■\u00A0';
async function zipBytes(blob, ini, fin){ return new Uint8Array(await blob.slice(ini, fin).arrayBuffer()); }
function zipNombre(crudo, flags, extra){
  // 1º el campo «Info-ZIP Unicode Path» (0x7075): el nombre en UTF-8 aunque no se marque
  for(let i=0;i+4<=extra.length;){
    const id=extra[i]|(extra[i+1]<<8), l=extra[i+2]|(extra[i+3]<<8);
    if(id===0x7075 && l>5){ try{ return new TextDecoder('utf-8',{fatal:true}).decode(extra.slice(i+9, i+4+l)); }catch(e){} }
    i+=4+l;
  }
  if(flags & 0x800) return new TextDecoder().decode(crudo);       // marcado como UTF-8
  try{ return new TextDecoder('utf-8',{fatal:true}).decode(crudo); }  // UTF-8 sin marcar
  catch(e){ let s=''; crudo.forEach(b=>{ s+= b<128 ? String.fromCharCode(b) : CP850_ALTO[b-128]; }); return s; }
}
// Índice del ZIP: [{nombre, metodo, cifrado, csize, usize, lho}]
async function zipEntradas(blob){
  const tam=blob.size;
  if(tam<22) throw new Error('zip');
  const desde=Math.max(0, tam-22-65535);   // el final del índice, con su comentario
  const cola=await zipBytes(blob, desde, tam), dv=new DataView(cola.buffer);
  let e=-1;
  for(let i=cola.length-22;i>=0;i--){ if(dv.getUint32(i,true)===0x06054b50){ e=i; break; } }
  if(e<0) throw new Error('zip');
  const n=dv.getUint16(e+10,true), cdTam=dv.getUint32(e+12,true), cdIni=dv.getUint32(e+16,true);
  if(n===0xFFFF || cdIni===0xFFFFFFFF || cdTam===0xFFFFFFFF) throw new Error('zip64');
  if(n>ZIP_MAX_ENTRADAS) throw new Error('zip-muchos');
  const cd=await zipBytes(blob, cdIni, cdIni+cdTam), cv=new DataView(cd.buffer);
  const out=[]; let p=0;
  for(let k=0;k<n && p+46<=cd.length;k++){
    if(cv.getUint32(p,true)!==0x02014b50) break;
    const flags=cv.getUint16(p+8,true), metodo=cv.getUint16(p+10,true),
          csize=cv.getUint32(p+20,true), usize=cv.getUint32(p+24,true),
          nlen=cv.getUint16(p+28,true), xlen=cv.getUint16(p+30,true), clen=cv.getUint16(p+32,true),
          lho=cv.getUint32(p+42,true);
    const crudo=cd.slice(p+46, p+46+nlen), extra=cd.slice(p+46+nlen, p+46+nlen+xlen);
    out.push({nombre:zipNombre(crudo, flags, extra), metodo, cifrado:!!(flags&1), csize, usize, lho});
    p+=46+nlen+xlen+clen;
  }
  return out;
}
// Bytes de un archivo del ZIP. Se descomprime por trozos y se corta en cuanto pasa
// del tamaño declarado o del máximo: un ZIP «bomba» no llena la memoria.
async function zipLeer(blob, en, maxBytes){
  if(en.cifrado || (en.metodo!==0 && en.metodo!==8)) throw new Error('zip-metodo');
  if(en.usize>maxBytes) throw new Error('zip-grande');
  const cab=await zipBytes(blob, en.lho, en.lho+30), cv=new DataView(cab.buffer);
  if(cab.length<30 || cv.getUint32(0,true)!==0x04034b50) throw new Error('zip');
  const ini=en.lho+30+cv.getUint16(26,true)+cv.getUint16(28,true);
  const datos=blob.slice(ini, ini+en.csize);
  if(en.metodo===0) return new Uint8Array(await datos.arrayBuffer());
  const tope=Math.min(maxBytes, en.usize||maxBytes);
  const lector=datos.stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const trozos=[]; let total=0;
  for(;;){
    const r=await lector.read(); if(r.done) break;
    total+=r.value.length;
    if(total>tope){ try{ lector.cancel(); }catch(e){} throw new Error('zip-grande'); }
    trozos.push(r.value);
  }
  const out=new Uint8Array(total); let o=0;
  trozos.forEach(x=>{ out.set(x,o); o+=x.length; });
  return out;
}
// Lector mínimo de .docx: localiza word/document.xml dentro del ZIP y extrae el texto.
async function docxToText(buf){
  const blob=new Blob([buf]);
  const en=(await zipEntradas(blob)).find(x=>x.nombre==='word/document.xml');
  if(!en) throw new Error('docx');
  let xml=new TextDecoder().decode(await zipLeer(blob, en, 50*1024*1024));
  xml=xml.replace(/<w:tab[^>]*\/>/g,' ').replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,'');
  return xml.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}

function crc32(u8){
  let t=crc32.t;
  if(!t){ t=crc32.t=new Uint32Array(256);
    for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0; } }
  let c=0xFFFFFFFF;
  for(let i=0;i<u8.length;i++) c=t[(c^u8[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
function zipStore(files){ // ZIP sin compresión: suficiente y sin dependencias
  const te=new TextEncoder(), parts=[], cd=[]; let ofs=0;
  const u16=v=>new Uint8Array([v&255,(v>>8)&255]);
  const u32=v=>new Uint8Array([v&255,(v>>8)&255,(v>>16)&255,(v>>24)&255]);
  files.forEach(f=>{
    const name=te.encode(f.name), crc=crc32(f.data), sz=f.data.length;
    const loc=[u32(0x04034b50),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(sz),u32(sz),u16(name.length),u16(0),name,f.data];
    cd.push({name,crc,sz,ofs});
    loc.forEach(x=>{ parts.push(x); ofs+=x.length; });
  });
  const cdStart=ofs; let cdLen=0;
  cd.forEach(f=>{
    const rec=[u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(f.crc),u32(f.sz),u32(f.sz),u16(f.name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(f.ofs),f.name];
    rec.forEach(x=>{ parts.push(x); cdLen+=x.length; });
  });
  [u32(0x06054b50),u16(0),u16(0),u16(cd.length),u16(cd.length),u32(cdLen),u32(cdStart),u16(0)].forEach(x=>parts.push(x));
  const total=parts.reduce((a,x)=>a+x.length,0), out=new Uint8Array(total);
  let o=0; parts.forEach(x=>{ out.set(x,o); o+=x.length; });
  return out;
}
function PLANTILLA_LINEAS(){ return getLang()==='en'?PLANTILLA_LINEAS_EN:PLANTILLA_LINEAS_ES; }
function plantillaDocxBytes(){
  const esc=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const body=PLANTILLA_LINEAS().map(l=>`<w:p><w:r><w:t xml:space="preserve">${esc(l)}</w:t></w:r></w:p>`).join('');
  const te=new TextEncoder();
  return zipStore([
    {name:'[Content_Types].xml', data:te.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')},
    {name:'_rels/.rels', data:te.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')},
    {name:'word/document.xml', data:te.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'</w:body></w:document>')},
  ]);
}
const MIME_DOCX='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
function bytesABase64(bytes){
  let bin='';
  for(let i=0;i<bytes.length;i+=8192) bin+=String.fromCharCode.apply(null, bytes.subarray(i,i+8192));
  return btoa(bin);
}

// Construye el objeto de copia con TODAS las claves mpt_* tal cual están
// guardadas (cadenas en crudo), para restaurarlas byte a byte.
function copiaDatosObj(){
  const data={};
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k && k.startsWith('mpt_')) data[k]=localStorage.getItem(k);
  }
  return {app:'momento-para-ti', ver:APP_VERSION, fecha:new Date().toISOString(), data};
}
async function exportarDatos(){
  try{
    const json=JSON.stringify(copiaDatosObj(), null, 1);
    const nombre=t('bk_fileprefix')+todayStr()+'.json';
    if(IS_NATIVE){
      const b64=btoa(unescape(encodeURIComponent(json)));
      // 1º: guardar directamente en la carpeta Descargas del móvil
      if(CapAjustes && CapAjustes.guardarDescarga){
        try{
          await CapAjustes.guardarDescarga({nombre, base64:b64, mime:'application/json'});
          avisoCopiaGuardada(nombre, b64);
          return;
        }catch(e){}
      }
      // 2º intento: menú de compartir (por si el guardado directo no está disponible)
      if(CapAjustes && CapAjustes.compartirArchivo){
        try{
          await CapAjustes.compartirArchivo({nombre, base64:btoa(unescape(encodeURIComponent(json))), mime:'application/json', titulo:t('bk_file_title')});
          return;
        }catch(e){}
      }
      if(CapFS && CapShare){
        try{
          await CapFS.writeFile({path:nombre, data:btoa(unescape(encodeURIComponent(json))), directory:'CACHE', recursive:true});
          const uri=await CapFS.getUri({path:nombre, directory:'CACHE'});
          await CapShare.share({title:t('bk_file_title'), files:[uri.uri], dialogTitle:t('bk_file_title')});
          return;
        }catch(e){}
      }
      toast(t('bk_export_fail'));
      return;
    }
    const blob=new Blob([json], {type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=nombre;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ try{URL.revokeObjectURL(a.href); a.remove();}catch(e){} }, 1000);
  }catch(e){ anota('exportar', e); toast(t('bk_export_fail')); }
}
// Tras guardar la copia: confirmación clara y opción de enviarla a otro sitio
// (correo, mensajería, la nube), útil para pasarla a otro móvil.
function avisoCopiaGuardada(nombre, b64){
  const box=document.getElementById('modalContent');
  box.innerHTML=`
    <h3>${t('bk_ok_title')}</h3>
    <p class="muted" style="line-height:1.5">${t('bk_ok_body')}</p>
    <p style="word-break:break-all;margin:8px 0 14px"><b>${nombre}</b></p>
    <p class="muted" style="line-height:1.5">${t('bk_ok_share')}</p>
    <button class="btn primary block" onclick="compartirCopia('${nombre}','${b64}')">${t('bk_share_btn')}</button>
    <button class="btn ghost block" onclick="closeModal()">${t('gd_ok')}</button>`;
  openModal();
}
// Envía un archivo por el menú de compartir de Android. Devuelve true si se abrió.
// Prueba primero el plugin propio y, si no está, el de Capacitor.
async function compartirBytes(nombre, b64, mime, titulo){
  try{
    if(CapAjustes && CapAjustes.compartirArchivo){
      await CapAjustes.compartirArchivo({nombre, base64:b64, mime, titulo});
      return true;
    }
    if(CapFS && CapShare){
      await CapFS.writeFile({path:nombre, data:b64, directory:'CACHE', recursive:true});
      const uri=await CapFS.getUri({path:nombre, directory:'CACHE'});
      await CapShare.share({title:titulo, files:[uri.uri], dialogTitle:titulo});
      return true;
    }
  }catch(e){}
  return false;
}
async function compartirCopia(nombre, b64){
  if(await compartirBytes(nombre, b64, 'application/json', t('bk_file_title'))) closeModal();
  else toast(t('bk_export_fail'));
}
// Valida y aplica una copia. Devuelve true si se aplicó.
function aplicarCopia(obj){
  if(!obj || obj.app!=='momento-para-ti' || typeof obj.data!=='object' || !obj.data) return false;
  // Solo se traen las claves conocidas y cada una pasa por su saneado: antes se
  // copiaba todo tal cual, y una copia manipulada podía colar código en la app.
  const limpia=sanearCopia(obj.data);
  if(!limpia) return false;
  // retirar las claves mpt_ actuales para no dejar restos de la instalación previa
  const actuales=[];
  for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.startsWith('mpt_')) actuales.push(k); }
  actuales.forEach(k=>{ try{localStorage.removeItem(k);}catch(e){} });
  Object.keys(limpia).forEach(k=>{ try{localStorage.setItem(k, JSON.stringify(limpia[k]));}catch(e){} });
  return true;
}
function importarDatosTexto(txt){
  let obj=null;
  try{ obj=JSON.parse(txt); }catch(e){ toast(t('bk_bad')); return false; }
  if(!obj || obj.app!=='momento-para-ti'){ toast(t('bk_bad')); return false; }
  if(!confirm(t('bk_confirm'))) return false;
  if(!aplicarCopia(obj)){ toast(t('bk_bad')); return false; }
  toast(t('bk_done'));
  setTimeout(()=>{ try{location.reload();}catch(e){} }, 900);
  return true;
}

async function descargarPlantilla(){
  const bytes=plantillaDocxBytes();
  if(IS_NATIVE){
    // 1ª vía: menú de compartir declarando el tipo Word, para que se ofrezcan
    // lectores de documentos además de guardar o enviar
    if(CapAjustes && CapAjustes.compartirArchivo){
      try{
        await CapAjustes.compartirArchivo({nombre:t('tpl_filename'), base64:bytesABase64(bytes),
          mime:MIME_DOCX, titulo:t('tpl_title')});
        return;
      }catch(e){}
    }
    // 2ª vía (APK antiguo): compartir con el plugin genérico
    if(CapFS && CapShare){
      try{
        await CapFS.writeFile({path:t('tpl_filename'), data:bytesABase64(bytes), directory:'CACHE', recursive:true});
        const uri=await CapFS.getUri({path:t('tpl_filename'), directory:'CACHE'});
        await CapShare.share({title:t('tpl_title'), files:[uri.uri], dialogTitle:t('tpl_title')});
        return;
      }catch(e){}
    }
    toast(t('ts_tpl_fail'));
    return;
  }
  // web: descarga directa
  try{
    const blob=new Blob([bytes], {type:MIME_DOCX});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=t('tpl_filename');
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }catch(e){ toast(t('ts_tpl_gen_fail')); }
}
// Firma de los ejemplos que trae la plantilla, calculada de la propia plantilla:
// si el usuario la sube sin tocarlos, se descartan. Si edita uno, deja de coincidir
// y sí se importa (ya es suyo). La lista se mantiene sola al cambiar la plantilla.
let _firmasEjemplo=null;
function firmaPractica(p){ return ((p.title||'')+'|'+(p.text||'')).replace(/\s+/g,' ').trim().toLowerCase(); }
function esEjemploPlantilla(p){
  // Los ejemplos de la plantilla se reconocen en AMBOS idiomas, independientemente
  // del idioma activo: cubre el caso de descargar la plantilla en un idioma y
  // subirla con la app en el otro.
  if(!_firmasEjemplo) _firmasEjemplo=parseFriendlyPracticas(PLANTILLA_LINEAS_ES.join('\n'))
    .concat(parseFriendlyPracticas(PLANTILLA_LINEAS_EN.join('\n'))).map(firmaPractica);
  return _firmasEjemplo.includes(firmaPractica(p));
}
function addImportedPracticas(arr){
  let n=0, ejemplos=0; const base=Date.now();
  (arr||[]).forEach((it,k)=>{
    if(!it || !it.title || (!it.text && !it.link)) return;
    if(esEjemploPlantilla(it)){ ejemplos++; return; }
    const p=sanearPractica({id:'u'+(base+k), cat:texto(it.cat,80)||'Importadas', title:texto(it.title,300),
             text:texto(it.text||t('default_link_text'),20000), link:it.link});
    if(!p) return;
    userLib.push(p); n++;
  });
  if(!n){
    toast(ejemplos ? t('im_only_examples') : t('im_none'));
    return;
  }
  LS.set('mpt_userlib', userLib); libCacheDirty();
  LS.set('mpt_plans', {});
  statUso('imp', n);
  scheduleNext();
  closeModal(); renderLib();
  toast(t('im_added').replace('{n}',n));
  const nuevas=userLib.slice(-n);
  if(confirm(t('cf_send_import').replace('{x}', n===1?t('cf_send_1'):t('cf_send_n').replace('{n}',n)))){
    enviarPracticasEmail(nuevas);
  }
}

function importPracticesFile(file){
  if(!file) return;
  if(file.size>IMPORT_MAX_MB*1024*1024){ toast(t('adj_too_big').replace('{n}', IMPORT_MAX_MB)); return; }
  if(/\.docx$/i.test(file.name||'')){
    // documento Word: se extrae el texto y se interpreta el formato de la plantilla
    file.arrayBuffer()
      .then(docxToText)
      .then(txt=>addImportedPracticas(parseFriendlyPracticas(txt)))
      .catch(()=>toast(t('ts_docx_fail')));
    return;
  }
  const r=new FileReader();
  r.onload=()=>{
    try{
      let txt=String(r.result).trim();
      // 1º se intenta como JSON (admite también un practices.js exportado);
      // 2º como texto con el formato de la plantilla (Título:/Categoría:/Texto:)
      let arr=null;
      const i=txt.indexOf('['), j=txt.lastIndexOf(']');
      if(i>=0 && j>i){ try{ const a=JSON.parse(txt.slice(i, j+1)); if(Array.isArray(a)) arr=a; }catch(e){} }
      if(!arr) arr=parseFriendlyPracticas(txt);
      addImportedPracticas(arr);
    }catch(e){ toast(t('ts_json_fail')); }
  };
  r.readAsText(file);
}

/* ---- Archivos para varias prácticas a la vez (ZIP) ----
   Cada archivo del ZIP se llama como el título de su práctica: «Respiración
   consciente.mp3». La persona reconoce cada práctica por su título, no por su
   código, así que el emparejamiento es por título. Dan igual las mayúsculas, las
   tildes y los signos (un nombre de archivo no admite «?» ni «:»), y vale el
   título en cualquiera de los idiomas de la biblioteca. Sirve para las prácticas
   de la biblioteca y para las propias. Los archivos se guardan en el dispositivo,
   igual que al añadirlos uno a uno. Primero se muestra qué va con qué y qué no
   encaja; no se guarda nada hasta confirmar. */
const ZIP_MIME={jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp',
  heic:'image/heic', avif:'image/avif', svg:'image/svg+xml',
  mp3:'audio/mpeg', m4a:'audio/mp4', aac:'audio/aac', ogg:'audio/ogg', oga:'audio/ogg', opus:'audio/ogg',
  wav:'audio/wav', flac:'audio/flac',
  mp4:'video/mp4', m4v:'video/mp4', webm:'video/webm', mov:'video/quicktime', '3gp':'video/3gpp',
  txt:'text/plain', md:'text/markdown', pdf:'application/pdf', epub:'application/epub+zip',
  doc:'application/msword', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt:'application/vnd.oasis.opendocument.text'};
// Título comparable: sin tildes, sin mayúsculas y sin signos (letras y números de cualquier alfabeto)
function normTitulo(s){
  return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
// título comparable → ids de las prácticas que lo tienen (en cualquier idioma)
function indiceTitulos(){
  const idx=new Map();
  const pon=p=>{ if(!p || !p.id) return; const k=normTitulo(p.title); if(!k) return;
    if(!idx.has(k)) idx.set(k, new Set()); idx.get(k).add(p.id); };
  ALL().forEach(pon);
  [typeof PRACTICES_ES!=='undefined'?PRACTICES_ES:[], typeof PRACTICES_EN!=='undefined'?PRACTICES_EN:[]]
    .forEach(l=>l.forEach(pon));
  return idx;
}
// Lo que sobra en cualquier ZIP: carpetas, la basura de macOS y Windows, ocultos
function zipEsBasura(ruta){
  const base=ruta.split(/[\/\\]/).pop();
  return !base || /\/$/.test(ruta) || /(^|[\/\\])__MACOSX[\/\\]/.test(ruta) || base.startsWith('.')
    || /^(thumbs\.db|desktop\.ini)$/i.test(base);
}
// Explicación y botón para elegir el ZIP (desde la Biblioteca o desde «Nueva práctica»)
function abrirZipInfo(){
  document.getElementById('modalContent').innerHTML=`
    <h3>${t('zip_title_info')}</h3>
    <p class="muted" style="line-height:1.55">${t('zip_help').replace('{n}', ADJ_MAX_MB)}</p>
    <button class="btn primary block" onclick="abrirZipAdjuntos()">${t('zip_choose')}</button>
    <button class="btn ghost block" onclick="closeModal()">${t('na_cancel')}</button>`;
  openModal();
}
let _zip=null;   // {blob, va:[…]} mientras se revisa el resultado
function abrirZipAdjuntos(){
  let el=document.getElementById('zip_file');
  if(!el){
    el=document.createElement('input'); el.type='file'; el.id='zip_file'; el.accept='.zip,application/zip';
    el.style.display='none'; el.onchange=()=>{ const f=el.files[0]; el.value=''; analizarZip(f); };
    document.body.appendChild(el);
  }
  el.click();
}
async function analizarZip(file){
  if(!file) return;
  let entradas;
  try{ entradas=await zipEntradas(file); }
  catch(e){ anota('zip', e); toast(e && e.message==='zip-muchos' ? t('zip_many').replace('{n}', ZIP_MAX_ENTRADAS) : t('zip_fail')); return; }
  const idx=indiceTitulos(), max=ADJ_MAX_MB*1024*1024, usados=new Set();
  const r={va:[], sin:[], varias:[], repes:[], grandes:[], malos:[]};
  entradas.forEach(en=>{
    if(zipEsBasura(en.nombre)) return;
    const nombre=en.nombre.split(/[\/\\]/).pop();
    const punto=nombre.lastIndexOf('.');
    const raiz=punto>0 ? nombre.slice(0, punto) : nombre, ext=punto>0 ? nombre.slice(punto+1).toLowerCase() : '';
    const ids=idx.get(normTitulo(raiz));
    if(!ids){ r.sin.push(nombre); return; }
    if(ids.size>1){ r.varias.push(nombre); return; }
    const pid=[...ids][0];
    if(usados.has(pid)){ r.repes.push(nombre); return; }
    if(en.usize>max){ r.grandes.push(nombre); return; }
    if(en.cifrado || (en.metodo!==0 && en.metodo!==8)){ r.malos.push(nombre); return; }
    usados.add(pid);
    r.va.push({en, pid, nombre, mime:ZIP_MIME[ext]||'application/octet-stream', cambia:!!adjDe(byId(pid))});
  });
  _zip={blob:file, va:r.va};
  pintarZip(r);
}
function pintarZip(r){
  const lista=(arr, f)=>{
    const vis=arr.slice(0, 40).map(f).join('');
    return `<ul class="ziplista">${vis}${arr.length>40?`<li class="muted">${t('zip_more').replace('{n}', arr.length-40)}</li>`:''}</ul>`;
  };
  const grupo=(clave, arr)=>arr.length ? `<p class="muted" style="margin:12px 0 4px"><b>${t(clave).replace('{n}', arr.length).replace('{m}', ADJ_MAX_MB)}</b></p>`
    + lista(arr, n=>`<li>${esc(n)}</li>`) : '';
  const p=x=>byId(x.pid)||{title:x.pid};
  document.getElementById('modalContent').innerHTML=`
    <h3>${t('zip_title')}</h3>
    ${r.va.length ? `<p class="muted" style="margin:0 0 4px"><b>${t('zip_ok').replace('{n}', r.va.length)}</b></p>
      ${lista(r.va, x=>`<li>${adjIcono(adjTipo(x.mime, x.nombre))} ${esc(x.nombre)} → <b>${esc(p(x).title)}</b>${x.cambia?` <span class="muted">(${t('zip_replace')})</span>`:''}</li>`)}`
      : `<p class="muted">${t('zip_none')}</p>`}
    ${grupo('zip_nomatch', r.sin)}${grupo('zip_ambig', r.varias)}${grupo('zip_dup', r.repes)}${grupo('zip_big', r.grandes)}${grupo('zip_bad', r.malos)}
    <p id="zip_estado" class="muted" style="margin:10px 0 0"></p>
    <div class="row" style="margin-top:14px">
      ${r.va.length?`<button id="zip_si" class="btn primary" style="flex:1" onclick="aplicarZip()">${t('zip_apply').replace('{n}', r.va.length)}</button>`:''}
      <button id="zip_no" class="btn ghost" style="flex:1" onclick="_zip=null;closeModal()">${t('na_cancel')}</button>
    </div>`;
  openModal(true);
}
// Guarda los archivos uno a uno (así un ZIP grande no ocupa toda la memoria a la vez)
async function aplicarZip(){
  const z=_zip; if(!z || !z.va.length) return;
  _zip=null;
  ['zip_si','zip_no'].forEach(id=>{ const b=document.getElementById(id); if(b) b.disabled=true; });
  const estado=document.getElementById('zip_estado');
  let hechos=0, fallos=0;
  for(let i=0;i<z.va.length;i++){
    const x=z.va[i];
    if(estado) estado.textContent=t('zip_working').replace('{i}', i+1).replace('{n}', z.va.length);
    try{
      const datos=await zipLeer(z.blob, x.en, ADJ_MAX_MB*1024*1024);
      const id='a'+Date.now()+Math.floor(Math.random()*1000)+'z'+i;
      await ADJ.guardar(id, new Blob([datos], {type:x.mime}));
      const ficha={id, tipo:adjTipo(x.mime, x.nombre), nombre:x.nombre, mime:x.mime, kb:Math.round(datos.length/1024)};
      let antes=null;
      if(esUserPractice(x.pid)){
        const k=userLib.findIndex(u=>u.id===x.pid);
        if(k<0){ ADJ.borrar(id).catch(()=>{}); fallos++; continue; }
        antes=userLib[k].adj; userLib[k].adj=ficha;
      } else { antes=adjLibreria[x.pid]; adjLibreria[x.pid]=ficha; }
      if(antes && antes.id) adjBorrar(antes.id).catch(()=>{});
      hechos++;
    }catch(e){ anota('zip-archivo', e); fallos++; }
  }
  LS.set('mpt_userlib', userLib); LS.set('mpt_adjlib', adjLibreria); libCacheDirty();
  try{ if(!IS_NATIVE && navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}
  if(hechos) statUso('zip', hechos);
  closeModal();
  try{ if(document.getElementById('liblist')) renderLibList(); }catch(e){}
  try{ hidratarAdjuntos(); }catch(e){}
  toast(fallos ? t('zip_partial').replace('{n}', hechos).replace('{f}', fallos) : t('zip_done').replace('{n}', hechos));
}
