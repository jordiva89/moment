/* Moment · Calendario descargable
   Solo en la versión web: el plan de tres lunas como archivo .ics.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

const ICS_LUNAS = 3;                  // tres lunas
const ICS_DIAS_LUNA = 28;             // de 28 días cada una
const ICS_DUR_MIN = 3;                // duración de cada evento, en minutos
const ICS_RENOVAR = [7,3,1];          // días antes del final en que se recuerda renovar
const WEB_APP_URL = 'https://moment.jordibeold.com';  // dónde se genera el calendario nuevo

/* ================== CALENDARIO DESCARGABLE (.ics) ==================
   La versión web no puede programar avisos: el navegador no tiene forma de
   despertar a nadie a una hora futura. En su lugar genera un archivo de
   calendario con el plan de tres lunas, que el móvil importa una vez y a
   partir de ahí avisa por su cuenta, sin conexión y sin servidor.
   El plan se calcula con getPlanFor(), el mismo que usa la app, así que el
   archivo y la aplicación dicen exactamente lo mismo: getPlanFor guarda cada
   día en mpt_plans la primera vez que se pide, y ya no vuelve a cambiar.     */

// Escapa los caracteres que el formato reserva (RFC 5545, 3.3.11).
function icsEsc(v){
  return String(v==null?'':v)
    .replace(/\\/g,'\\\\').replace(/;/g,'\\;')
    .replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
}
// Cada línea del archivo admite 75 octetos. Las más largas se parten y la
// continuación empieza por un espacio. Se cuenta en bytes, no en letras: una
// "ó" ocupa dos. Si esto se hace mal, hay calendarios que rechazan el archivo
// entero sin decir por qué.
function icsFold(linea){
  const enc=new TextEncoder();
  if(enc.encode(linea).length<=75) return linea;
  const partes=[]; let actual='', bytes=0;
  for(const ch of linea){
    const n=enc.encode(ch).length;
    if(bytes+n>75){ partes.push(actual); actual=' '; bytes=1; }
    actual+=ch; bytes+=n;
  }
  partes.push(actual);
  return partes.join('\r\n');
}
// Fecha de dentro de n días, en el formato interno AAAA-MM-DD.
function icsDia(n){
  const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
// Momento de creación del archivo, este sí en horario universal.
function icsStamp(){
  const d=new Date();
  return d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+'T'+
         pad(d.getUTCHours())+pad(d.getUTCMinutes())+pad(d.getUTCSeconds())+'Z';
}
// Hora flotante: sin zona horaria y sin Z. Significa "las 10:00 dondequiera
// que estés", que es lo que quiere una práctica. Así el aviso no se desplaza
// al viajar y el cambio de hora de octubre y marzo se resuelve solo.
// Los minutos por encima de 1440 pasan al día siguiente, como debe ser.
function icsHora(dstr, mins){
  const d=new Date(dstr+'T00:00:00'); d.setMinutes(d.getMinutes()+mins);
  return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T'+
         pad(d.getHours())+pad(d.getMinutes())+'00';
}
function icsEvento(o){
  const L=['BEGIN:VEVENT','UID:'+o.uid,'DTSTAMP:'+icsStamp(),
           'DTSTART:'+o.inicio,'DTEND:'+o.fin,'SUMMARY:'+icsEsc(o.titulo)];
  if(o.desc) L.push('DESCRIPTION:'+icsEsc(o.desc));
  if(o.url)  L.push('URL:'+o.url);
  if(o.cat)  L.push('CATEGORIES:'+icsEsc(o.cat));
  // El evento no ocupa la agenda: quien comparta calendario no aparecerá
  // ocupado 420 veces.
  L.push('TRANSP:TRANSPARENT','SEQUENCE:0');
  L.push('BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:PT0S',
         'DESCRIPTION:'+icsEsc(o.titulo),'END:VALARM','END:VEVENT');
  return L;
}
function generarICS(){
  const total=ICS_LUNAS*ICS_DIAS_LUNA;
  const L=['BEGIN:VCALENDAR','VERSION:2.0',
           'PRODID:-//El Noveno Camino//Moment '+APP_VERSION+'//'+getLang().toUpperCase(),
           'CALSCALE:GREGORIAN','X-WR-CALNAME:Moment',
           'X-WR-CALDESC:'+icsEsc(t('cal_ics_desc'))];
  let primeraHora=null;
  for(let d=0; d<total; d++){
    const dstr=icsDia(d);
    (getPlanFor(dstr)||[]).forEach(sl=>{
      const p=byId(sl.pid); if(!p) return;
      if(primeraHora===null) primeraHora=sl.time;
      const enlace=enlaceSeguro(p.link);
      const desc=(p.text||'')+(enlace?('\n\n'+enlace):'')+'\n\n'+t('legal_ics');
      L.push(...icsEvento({
        uid:'moment-'+dstr+'-'+pad(Math.floor(sl.time/60)%24)+pad(sl.time%60)+'-'+sl.pid+'@elnovenocamino',
        inicio:icsHora(dstr, sl.time), fin:icsHora(dstr, sl.time+ICS_DUR_MIN),
        titulo:t('cal_ics_prefix')+p.title, desc, url:enlace, cat:catLabel(p.cat)
      }));
    });
  }
  // Avisos de renovación, dentro del propio calendario: si se borra, se van con él.
  const hora=(primeraHora==null?9*60:primeraHora);
  ICS_RENOVAR.forEach(n=>{
    const dstr=icsDia(total-n);
    L.push(...icsEvento({
      uid:'moment-renovar-'+dstr+'@elnovenocamino',
      inicio:icsHora(dstr,hora), fin:icsHora(dstr,hora+ICS_DUR_MIN),
      titulo:t('cal_ics_renew'),
      desc:t('cal_ics_renew_txt').replace('{n}',n)+'\n\n'+WEB_APP_URL,
      url:WEB_APP_URL, cat:''
    }));
  });
  L.push('END:VCALENDAR');
  return L.map(icsFold).join('\r\n')+'\r\n';
}
function descargarICS(){
  try{
    const blob=new Blob([generarICS()],{type:'text/calendar;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='moment-'+todayStr()+'.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
    toast(t('cal_ok'));
  }catch(e){ toast(t('cal_err')); }
}
