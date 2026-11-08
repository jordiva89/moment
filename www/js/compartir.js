/* Moment · Compartir y textos legales
   Invitar a otras personas, el APK incluido, la suscripción y las condiciones y privacidad.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

let apkAssetOk = false;
// ¿Hay una copia del APK dentro de la app para poder compartirla?
// Antes esto DESCARGABA el archivo entero (más de 10 MB) solo para mirar su tamaño,
// y además lo hacía en cada arranque. Ahora se pregunta solo por la cabecera y la
// comprobación se hace la primera vez que se necesita, no al abrir la app.
async function checkApkAsset(){
  try{
    if(typeof fetch!=='function') return;
    const base=(location.origin&&location.origin!=='null')?location.origin+location.pathname.replace(/[^/]*$/,''):'./';
    let r=null;
    try{ r=await fetch(base+APK_ASSET, {method:'HEAD', cache:'no-store'}); }catch(e){}
    if(r && r.ok){
      const n=parseInt(r.headers.get('content-length')||'0', 10);
      // si el servidor no informa del tamaño, basta con que el archivo exista
      apkAssetOk = n ? n>500000 : true;
      return;
    }
    // algunos entornos no admiten HEAD: se pide solo el primer byte
    const g=await fetch(base+APK_ASSET, {cache:'no-store', headers:{Range:'bytes=0-0'}});
    apkAssetOk = !!(g && (g.ok || g.status===206));
  }catch(e){ apkAssetOk=false; anota('apk-incrustado', e); }
}

// Pega aquí la URL del formulario incrustado de tu audiencia de Mailchimp
// (Audience → Signup forms → Embedded forms → atributo action del <form>)
// Página de suscripción ALOJADA en Mailchimp. La app NO envía datos: abre esta página
// en el navegador y es Mailchimp quien recoge el email y el consentimiento RGPD.
// Así la app sigue sin conectarse a internet por su cuenta.
const MAILCHIMP_FORM_URL_ES = 'https://mailchi.mp/944b87656bc7/app-momento-para-ti';
const MAILCHIMP_FORM_URL_EN = 'https://mailchi.mp/31e72cf0c6bb/app-momento-para-ti-ingls';
function MAILCHIMP_FORM_URL(){ return getLang()==='en' ? MAILCHIMP_FORM_URL_EN : MAILCHIMP_FORM_URL_ES; }

function verLegal(cual){
  document.getElementById('modalContent').innerHTML=`
    <h3>${cual==='cond'?t('pr_terms'):t('pr_privacy')}</h3>
    <p class="muted" style="white-space:pre-wrap;line-height:1.55">${cual==='cond'?LEGAL_COND():LEGAL_PRIV()}</p>
    <button class="btn primary block" onclick="closeModal()">${t('legal_close')}</button>`;
  openModal();
}
// Abre el formulario de suscripción de Mailchimp en el navegador, con el email ya
// escrito si es posible. La app no transmite nada: el alta y el consentimiento los
// recoge Mailchimp en su propia página.
function abrirFormularioSuscripcion(){
  if(!MAILCHIMP_FORM_URL()) return false;
  try{
    const a=document.createElement('a');
    a.href=MAILCHIMP_FORM_URL(); a.target='_blank'; a.rel='noopener';
    document.body.appendChild(a); a.click(); a.remove();
    return true;
  }catch(e){ return false; }
}
const LEGAL_COND_ES=`Condiciones de uso:
1. "Moment" es una aplicación de bienestar que propone prácticas breves de carácter espiritual y transpersonal. No sustituye atención médica ni psicológica profesional.
2. El uso es voluntario y bajo la responsabilidad del usuario, que adaptará las prácticas (especialmente las respiraciones) a su condición física.
3. El contenido de la biblioteca puede incluir enlaces a sitios de terceros, de cuyo contenido no nos hacemos responsables.
4. La app se ofrece "tal cual", sin garantías de disponibilidad o exactitud.`;
const LEGAL_COND_EN=`Terms of use:
1. "Moment for you" is a wellness app that suggests brief practices of a spiritual and transpersonal nature. It is not a substitute for professional medical or psychological care.
2. Use is voluntary and at the user's own responsibility; the user should adapt the practices (especially the breathing ones) to their physical condition.
3. The library content may include links to third-party sites, for whose content we are not responsible.
4. The app is provided "as is", with no guarantees of availability or accuracy.`;
const LEGAL_PRIV_ES=`Política de privacidad:
1. Responsable: Jordi Beold (contacto: ${METRICS_EMAIL}).
2. Datos tratados: la dirección de email que facilitas al suscribirte, y métricas de uso de la app: recuentos de prácticas hechas, pospuestas y descartadas, del uso de cada modo y función, y la configuración (nunca tus textos, los títulos de tus prácticas propias ni los nombres de tus archivos).
3. Finalidad: enviarte comunicaciones sobre la app y estudiar los patrones de práctica para mejorar el servicio. La lista de correo se gestiona con Mailchimp: la app no envía tu email a ningún sitio; el alta la completas tú en el formulario de Mailchimp, que recoge allí tu consentimiento.
4. Base legal: tu consentimiento, que puedes retirar en cualquier momento escribiendo al contacto indicado o mediante el enlace de baja de los correos.
5. Conservación: mientras dure tu suscripción. Las métricas se guardan en tu dispositivo (30 días) y solo se envían asociadas a tu email con tu consentimiento.
6. Derechos: acceso, rectificación, supresión, oposición y portabilidad, ante el contacto indicado.`;
const LEGAL_PRIV_EN=`Privacy policy:
1. Controller: Jordi Beold (contact: ${METRICS_EMAIL}).
2. Data processed: the email address you provide when subscribing, and app usage metrics: counts of practices done, snoozed and skipped, of the use of each mode and feature, and the settings (never your texts, the titles of your own practices or the names of your files).
3. Purpose: to send you communications about the app and to study practice patterns to improve the service. The mailing list is managed with Mailchimp: the app does not send your email anywhere; you complete the sign-up yourself in the Mailchimp form, which collects your consent there.
4. Legal basis: your consent, which you may withdraw at any time by writing to the contact indicated or via the unsubscribe link in the emails.
5. Retention: for as long as your subscription lasts. Metrics are stored on your device (30 days) and are only sent associated with your email with your consent.
6. Rights: access, rectification, erasure, objection and portability, before the contact indicated.`;
function LEGAL_COND(){ return getLang()==='en'?LEGAL_COND_EN:LEGAL_COND_ES; }
function LEGAL_PRIV(){ return getLang()==='en'?LEGAL_PRIV_EN:LEGAL_PRIV_ES; }

function shareMsg(){
  if(getLang()==='en') return 'I invite you to try "Moment"! 🌿\n'
    +'Small practices for big changes: brief suggestions (under 3 minutes) of breathing exercises, meditations and more, spread throughout your day and however you like.\n\n'
    +'Since this app can be used offline and we don\u2019t store any data on any server, we suggest installing it this way:\n'
    +'0. If you\u2019d like peace of mind before installing, you can check for yourself that the app is safe: upload the APK file to virustotal.com or ask an AI to analyze its contents. The app doesn\u2019t connect to the internet or contain trackers, and any analysis will confirm it.\n'
    +'1. Open the moment.apk file you receive. If it arrives compressed, open it first and inside you\u2019ll find the .apk file: that\u2019s the one to open.\n'
    +'2. If Android warns about "unknown sources", allow the installation.\n'
    +'3. Open the app, set up your schedule and accept notifications.\n\n'
    +'Enjoy it 🙏 I wish you prosperous, strong and abundant growth.\n\n'
    +'Jordi Beold';
  return '¡Te invito a probar «Moment»! 🌿\n'
    +'Pequeñas prácticas para grandes cambios: propuestas breves (menos de 3 minutos) de respiraciones, meditaciones y más, repartidas a lo largo de tu día y como tú quieras.\n\n'
    +'Ya que esta app permite ser usada sin conexión y no guardamos ningún dato en ningún servidor, te proponemos instalarla de esta manera:\n'
    +'0. Si quieres quedarte tranquilo antes de instalar, puedes comprobar tú mismo que la app es segura: sube el archivo APK a virustotal.com o pídele a una inteligencia artificial que analice su contenido. La app no se conecta a internet ni contiene rastreadores, y cualquier análisis lo confirmará.\n'
    +'1. Abre el archivo moment.apk que te llegue. Si te llega comprimido, ábrelo primero y dentro encontrarás el archivo .apk: ese es el que hay que abrir.\n'
    +'2. Si Android avisa de «orígenes desconocidos», permite la instalación.\n'
    +'3. Abre la app, configura tu horario y acepta las notificaciones.\n\n'
    +'Que la disfrutes 🙏 Te deseo un próspero, fuerte y abundante crecimiento.\n\n'
    +'Jordi Beold';
}
async function shareApp(target){
  const msg=shareMsg();
  if(IS_NATIVE && CapShare && CapFS){
    // (re)comprobar el APK por si el primer intento aún no había terminado
    if(!apkAssetOk) await checkApkAsset();
    if(apkAssetOk){
      try{
        toast(t('share_preparing_a')+' '+target+' '+t('share_preparing_b'));
        const base=(location.origin&&location.origin!=='null')?location.origin+location.pathname.replace(/[^/]*$/,''):'./';
        const res=await fetch(base+APK_ASSET, {cache:'no-store'});
        const blob=await res.blob();
        const b64=await new Promise((ok,ko)=>{ const fr=new FileReader(); fr.onload=()=>ok(String(fr.result).split(',')[1]); fr.onerror=ko; fr.readAsDataURL(blob); });
        // se escribe en la caché de la app y se comparte el archivo con "files" (API Share 6.x)
        await CapFS.writeFile({path:'MomentoParaTi.apk', data:b64, directory:'CACHE', recursive:true});
        const uri=await CapFS.getUri({path:'MomentoParaTi.apk', directory:'CACHE'});
        // algunas apps (WhatsApp) ignoran el texto cuando se adjunta un archivo:
        // se copia el mensaje al portapapeles para poder pegarlo junto al archivo
        const copiado=await copyText(msg);
        if(copiado) toast(t('ts_copied'));
        await CapShare.share({title:t('app_title'), text:msg, files:[uri.uri], dialogTitle:t('share_dialog')+' '+target});
        return;
      }catch(e){ toast(t('ts_no_attach')); }
    }
  }
  if(IS_NATIVE && CapShare){
    try{ await CapShare.share({title:t('app_title'), text:msg, dialogTitle:t('share_dialog')+' '+target}); return; }catch(e){}
  }
  const enc=encodeURIComponent(msg);
  if(target==='WhatsApp') location.href='https://wa.me/?text='+enc;
  else if(target==='Telegram') location.href='https://t.me/share/url?url='+encodeURIComponent(APK_DOWNLOAD_URL||'Moment')+'&text='+enc;
  else location.href='mailto:?subject='+encodeURIComponent('Te invito a probar «Moment»')+'&body='+enc;
}

function enviarPracticasEmail(lista){
  const cuerpo=lista.map(p=>{
    let t=window.t('fmt_title')+p.title+'\n'+window.t('fmt_cat')+p.cat+'\n'+window.t('fmt_text')+p.text;
    if(p.link) t+='\nEnlace: '+p.link;
    return t;
  }).join('\n\n');
  const asunto=lista.length===1 ? t('sh_mail_sub1')+lista[0].title
                                 : t('sh_mail_subn').replace('{n}', lista.length);
  const intro=lista.length===1 ? t('sh_mail_1') : t('sh_mail_n');
  const cuerpoMail=t('sh_mail_hi')+'\n\n'+intro+'\n\n'+cuerpo+'\n\n'+t('sh_mail_bye');
  location.href='mailto:'+METRICS_EMAIL+'?subject='+encodeURIComponent(asunto)+'&body='+encodeURIComponent(cuerpoMail);
}
