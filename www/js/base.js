/* Moment · Estado común y utilidades
   El almacén (localStorage), el entorno (APK o navegador), las constantes, el estado compartido de la app y las utilidades que usa todo lo demás.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

const LS = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v===null? d : JSON.parse(v);}catch(e){return d} },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  remove(k){ try{ localStorage.removeItem(k); }catch(e){} }
};

const APP_VERSION = '3.92';   // visible en Ajustes: confirma qué versión está corriendo

const IS_NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const CapLN  = IS_NATIVE ? window.Capacitor.Plugins.LocalNotifications : null;
const CapApp = IS_NATIVE ? window.Capacitor.Plugins.App : null;
const CapShare = IS_NATIVE ? window.Capacitor.Plugins.Share : null;
const CapAjustes = IS_NATIVE ? (window.Capacitor.Plugins.Ajustes||null) : null;
const CapFS = IS_NATIVE ? window.Capacitor.Plugins.Filesystem : null;

let nativePerm='prompt', exactPerm='prompt', pendingOpen=null;

const METRICS_EMAIL = 'jordibeold@jordibeold.com';
const APK_ASSET = 'moment.apk';   // copia del APK dentro de la app (opcional, ver Ajustes)
const APK_DOWNLOAD_URL = '';               // enlace de descarga alternativo (opcional)
const METRICS_CADA_DIAS = 3;

const DAYS_AHEAD = 4;    // días de avisos programados por adelantado en el sistema.
// Cuatro días bastan: la app reprograma al abrirse y, si no se abre, RECARGA_DIAS (4)
// dispara una recarga silenciosa. Menos alarmas en cola = menos trabajo en cada
// reprogramación y un perfil más discreto ante las políticas de alarmas exactas.
const RECARGA_DIAS = 4;  // recarga silenciosa si han pasado 4 días desde la última programación

const FIB_INC = [1,1,2,3,5,8,13,21,34,55]; // minutos adicionales por posposición
let cfg      = LS.get('mpt_cfg', null);          // {startH, startM, freq, span}
let favs     = LS.get('mpt_favs', []);
let userLib  = LS.get('mpt_userlib', []);
let userEvents = LS.get('mpt_events', []);   // "Momentos para ti" propios con repetición
let paused = LS.get('mpt_paused', []);       // prácticas en pausa (no se proponen ni se muestran)
let evPaused = LS.get('mpt_evpaused', []);   // momentos propios en pausa
let alarmMode = LS.get('mpt_alarm', false);  // sonar como despertador aunque el móvil esté en silencio

let dayState = LS.get('mpt_day', null);
let notifTimer = null, tab='home';
let expandedSlots=new Set(), expandedDay=null, lastAutoNext=-1, showPast=true, showDay=true;
let showNextDay=true, expandedNext=new Set(), showPausedBox=true, expandedPaused=new Set();
let showLibBox=true, expandedLib=new Set();
let showHechas=true, expandedHechas=new Set();
let showPropias=true, expandedPropias=new Set();
let showFavBox=true, expandedFav=new Set();

let notifOn = LS.get('mpt_notifOn', true);   // interruptor propio de la app

// Caché de la biblioteca completa: se reconstruye solo cuando cambian las prácticas propias.
// Evita crear un array nuevo y buscar linealmente en cada llamada (ambas se usan en bucles).
let _allCache=null, _byIdCache=null;
function libCacheDirty(){ _allCache=null; _byIdCache=null; }
const ALL = () => _allCache || (_allCache = PRACTICES.concat(userLib));
const byId = id => {
  if(!_byIdCache){ _byIdCache=new Map(); ALL().forEach(p=>_byIdCache.set(p.id,p)); }
  return _byIdCache.get(id);
};
const pad = n => String(n).padStart(2,'0');
const todayStr = () => { const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
const dateStrOf = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const fmtT = mins => pad(Math.floor(mins/60)%24)+':'+pad(mins%60);
const nowMins = () => { const d=new Date(); return d.getHours()*60+d.getMinutes(); };

async function copyText(t){
  try{ await navigator.clipboard.writeText(t); return true; }catch(e){}
  // respaldo para WebView: textarea temporal + execCommand
  try{
    const ta=document.createElement('textarea');
    ta.value=t; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok=document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }catch(e){ return false; }
}

function toast(msg){
  const el=document.createElement('div'); el.className='toast'; el.textContent=msg;
  document.body.appendChild(el);
  // cuanto más largo el mensaje, más tiempo en pantalla (entre 2,6 y 7 segundos)
  const ms=Math.min(7000, Math.max(2600, 1200 + String(msg).length*55));
  setTimeout(()=>el.remove(), ms);
}

function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

const eff = s => s.snoozeUntil!==null ? s.snoozeUntil : s.time;

// Escapa el contenido creado por el usuario antes de insertarlo en HTML.
// Sin esto, un título con < o " rompe el diseño (o el atributo que lo contiene).
function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// acciones sobre el plan de mañana (persistido en mpt_plans)
function nextDateStr(){ const m=new Date(); m.setDate(m.getDate()+1); return dateStrOf(m); }

let modalOpen=false;
function openModal(full){
  document.getElementById('modalContent').classList.toggle('full', !!full);
  document.getElementById('modal').classList.remove('hidden');
  modalOpen=true;
  history.pushState({app:1, modal:1},''); // estado extra: el botón atrás lo consumirá cerrando el modal
}
function closeModal(){ document.getElementById('modal').classList.add('hidden'); modalOpen=false; }
