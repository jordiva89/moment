const fs = require('fs'), path = require('path');
const W = path.join(__dirname, '..', '..', 'www') + path.sep;
// El diccionario y el contenido viven en archivos aparte: se concatenan para
// que el análisis siga viendo el conjunto completo de textos.
const s = fs.readFileSync(W+'index.html','utf8') + '\n'
        + fs.readFileSync(W+'i18n.js','utf8') + '\n'
        + fs.readFileSync(W+'contenido.js','utf8');
const js = fs.readFileSync(W+'index.html','utf8').match(/<script>([\s\S]*)<\/script>/g).pop().replace(/<\/?script>/g,'')
        + '\n' + fs.readFileSync(W+'i18n.js','utf8') + '\n' + fs.readFileSync(W+'contenido.js','utf8');
const L = js.split('\n');

// 1. funciones sin uso (contando invocación por nombre en cadena)
const defs = {};
L.forEach((l,i)=>{ const d=l.match(/^(?:async )?function (\w+)/); if(d) defs[d[1]]=i+1; });
const muertas = Object.keys(defs).filter(n=>{
  const dir = (s.match(new RegExp('\\b'+n+'\\s*\\(','g'))||[]).length;      // llamadas
  const cad = (s.match(new RegExp("['\"]"+n+"['\"]",'g'))||[]).length;        // invocada por nombre
  const ref = (s.match(new RegExp('[(,=]\\s*'+n+'\\s*[),;]','g'))||[]).length; // pasada como referencia
  return dir<=1 && cad===0 && ref===0;
});
console.log('== Funciones sin uso ('+muertas.length+'):', muertas.join(', ')||'ninguna');

// 2. claves i18n sin uso
// El diccionario se delimita contando llaves: buscar '\n  },' fallaba porque el
// bloque inglés es el último y arrastraba código posterior, colando como "claves"
// propiedades de objetos JavaScript (id, title, channelId…).
function bloqueIdioma(txt, marca){
  const ini = txt.indexOf(marca);
  if (ini < 0) return '';
  let prof = 0;
  for (let k = ini; k < txt.length; k++){
    if (txt[k] === '{') prof++;
    else if (txt[k] === '}'){ prof--; if (prof === 0) return txt.slice(ini, k); }
  }
  return txt.slice(ini);
}
const bES = bloqueIdioma(s, '  es:{');
const bEN = bloqueIdioma(s, '  en:{');
const kES = new Set([...bES.matchAll(/\n    (\w+):/g)].map(m=>m[1]));
const kEN = new Set([...bEN.matchAll(/\n    (\w+):/g)].map(m=>m[1]));
const sinUso = [...kES].filter(k => !new RegExp("t\\(['\"]"+k+"['\"]|I18N\\.\\w+\\."+k+"\\b|data-lbl=\""+k+'"').test(s));
console.log('== Claves i18n sin uso ('+sinUso.length+'):', sinUso.join(', ')||'ninguna');
console.log('== i18n ES:'+kES.size+' EN:'+kEN.size+' · faltan en EN:', [...kES].filter(k=>!kEN.has(k)).join(', ')||'ninguna');

// 3. textos de interfaz sin traducir
const zonas = [['  es:{','\n  },'],['  en:{','\n  },'],['const ACEPT_ES','function ACEPT()'],
               ['const NC_TEXTO_ES','function NC_TEXTO()'],['const NOVENO_QS_ES','function NOVENO_QS()'],['const PLANTILLA_LINEAS_ES','function PLANTILLA_LINEAS()']]
  .map(([a,b])=>[js.indexOf(a), js.indexOf(b, js.indexOf(a))]);
const ESre = /[áéíóúñ¿¡]|\b(Pospuesta|Plegar|Guardar|Cancelar|Aviso|Hecha|día|hora)\b/;
// Los textos fijos se buscan solo en index.html: i18n.js y contenido.js SON
// texto por definición, no código con literales incrustados.
const Lh = fs.readFileSync(W+'index.html','utf8')
  .match(/<script>([\s\S]*)<\/script>/g).pop().replace(/<\/?script>/g,'').split('\n');
let pos=0, fijos=[];
Lh.forEach((l,i)=>{
  const desde=pos; pos+=l.length+1;
  if (zonas.some(([a,b])=>desde>=a&&desde<=b)) return;
  const limpia=l.replace(/\/\/.*$/,'').trim();
  if(!limpia||limpia.startsWith('//')||limpia.startsWith('*')) return;
  // Una rama española dentro de un condicional bilingüe NO es texto sin traducir:
  // getLang()==='en' ? 'English' : 'Español' ya está resuelto correctamente.
  // el condicional puede abrirse líneas antes, así que se mira el entorno
  const entorno = Lh.slice(Math.max(0,i-6), i+1).join(' ');
  if(/getLang\(\)\s*===\s*'en'\s*\?|LANG\s*===\s*'en'\s*\?/.test(entorno)) return;
  const lits=(limpia.match(/'[^']{5,}'|"[^"]{5,}"/g)||[])
    .filter(x=>ESre.test(x) && !/data-|style=|class=|px|rgba|http|\.php|@|svg|viewBox/.test(x));
  if(lits.length) fijos.push((i+1)+': '+lits.join(' · ').slice(0,90));
});
console.log('== Textos fijos en español ('+fijos.length+')'); fijos.forEach(f=>console.log('   '+f));

// 4. duplicación de bloques
const norm=L.map(l=>l.trim()).filter(l=>l.length>30 && !l.startsWith('//'));
const vis={},dup={};
for(let i=0;i<norm.length-2;i++){ const k=norm.slice(i,i+3).join('|'); if(vis[k])dup[k]=(dup[k]||1)+1; else vis[k]=1; }
const ds=Object.entries(dup).sort((a,b)=>b[1]-a[1]).slice(0,4);
console.log('== Bloques de 3 líneas repetidos:'); ds.forEach(([k,n])=>console.log('   x'+n+': '+k.split('|')[0].slice(0,80)));

// 5. tamaño de las funciones
// Longitud real de cada función. Contar llaves crudas daba resultados absurdos
// (setLang, de una sola línea, salía con 535) porque las llaves dentro de cadenas
// y plantillas descuadran el balance. Se ignoran las de dentro de comillas.
function sinCadenas(l){
  return l.replace(/\\./g,'').replace(/'(?:[^'\\]|\\.)*'/g,"''")
          .replace(/"(?:[^"\\]|\\.)*"/g,'""').replace(/`(?:[^`\\]|\\.)*`/g,'``')
          .replace(/\/\/.*$/,'');
}
const largos=Object.keys(defs).map(n=>{
  const ini=defs[n]-1; let p=0,fin=ini, abierta=false;
  for(let i=ini;i<L.length;i++){
    const c=sinCadenas(L[i]);
    const a=(c.match(/\{/g)||[]).length, b=(c.match(/\}/g)||[]).length;
    if(a) abierta=true;
    p+=a-b;
    // se cierra en cuanto el balance vuelve a cero: una función de una sola línea
    // termina en su propia línea, no en la siguiente
    if(abierta && p<=0){ fin=i; break; }
  }
  return {n,len:fin-ini+1};
}).sort((a,b)=>b.len-a.len).slice(0,5);
console.log('== Funciones más largas:'); largos.forEach(f=>console.log('   '+String(f.len).padStart(4)+'  '+f.n));

// 6. riesgos
console.log('== Riesgos:');
console.log('   eval() en el código:', (js.match(/\beval\(/g)||[]).length);
console.log('   innerHTML con datos del usuario sin escapar:', (js.match(/innerHTML\s*=\s*[^;]*\$\{(?!esc\()/g)||[]).length);
console.log('   try/catch vacíos:', (js.match(/catch\s*\(\w*\)\s*\{\s*\}/g)||[]).length);
console.log('   variables globales:', L.filter(l=>/^(let|const|var) /.test(l)).length);
