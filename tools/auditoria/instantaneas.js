// Instantáneas de las pantallas, para refactorizar sin cambiar nada.
//
//   node tools/auditoria/instantaneas.js --guardar antes.json
//   node tools/auditoria/instantaneas.js --comparar antes.json
//
// Arranca la app con la fecha fija y el azar sembrado, pinta las pantallas
// principales (en modo APK y en modo web) y guarda su HTML. Al comparar, cualquier
// diferencia indica que el cambio ha alterado lo que ve la persona.
const { JSDOM } = require(require('./entorno').rutaJsdom());
const fs = require('fs');
const { htmlConScripts } = require('./entorno');

function arrancar(nativo){
  return new Promise(res=>{
    const dom = new JSDOM(htmlConScripts(), { runScripts:'dangerously', url:'https://app.local/',
      beforeParse(w){
        const R=w.Date; let _t=0;
        class FD extends R{ constructor(...a){ a.length?super(...a):super(2026,7,29,10,0,0);} static now(){return new R(2026,7,29,10,0,0).getTime()+(_t++);} }
        w.Date=FD;
        let seed=7; w.Math.random=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
        w.localStorage.setItem('mpt_cfg', JSON.stringify({startH:8,startM:0,freq:2,span:14,favPerDay:1,catsPref:{},visDia:false}));
        w.localStorage.setItem('mpt_lang', JSON.stringify('es'));
        w.localStorage.setItem('mpt_accept', JSON.stringify({v:1,ts:1}));
        w.localStorage.setItem('mpt_install', JSON.stringify(1756000000000));
        w.localStorage.setItem('mpt_stats', JSON.stringify({lastOpen:0,lastDone:0,lastSend:0,days:{}}));
        w.scrollTo=()=>{}; w.requestAnimationFrame=f=>{try{f()}catch(e){}};
        w.confirm=()=>true; w.alert=()=>{}; w.fetch=()=>Promise.reject();
        w.Notification=function(){}; w.Notification.permission='granted';
        w.navigator.serviceWorker={register:()=>Promise.resolve({update(){}}),addEventListener:()=>{},getRegistration:()=>Promise.resolve(null)};
        if(nativo) w.Capacitor={ isNativePlatform:()=>true, Plugins:{
          Ajustes:{ renombrarCanal:()=>Promise.resolve(), abrirPantalla:()=>Promise.resolve(), compartirArchivo:()=>Promise.resolve(),
                    guardarDescarga:()=>Promise.resolve(), listarArchivosMoment:()=>Promise.resolve({archivos:[]}),
                    infoDispositivo:()=>Promise.resolve({}) },
          LocalNotifications:{ checkPermissions:()=>Promise.resolve({display:'granted'}), requestPermissions:()=>Promise.resolve({display:'granted'}),
            schedule:()=>Promise.resolve(), cancel:()=>Promise.resolve(), getPending:()=>Promise.resolve({notifications:[]}),
            addListener:()=>Promise.resolve(), removeAllListeners:()=>Promise.resolve(), createChannel:()=>Promise.resolve(),
            listChannels:()=>Promise.resolve({channels:[]}), deleteChannel:()=>Promise.resolve(), registerActionTypes:()=>Promise.resolve() },
          App:{ addListener:()=>Promise.resolve({remove(){}}), removeAllListeners:()=>Promise.resolve() } } };
      }});
    setTimeout(()=>res(dom.window), 2500);
  });
}
const main = w => w.document.getElementById('main').innerHTML;
const modal = w => w.document.getElementById('modalContent').innerHTML;

async function pantallas(nativo){
  const w = await arrancar(nativo), out = {};
  w.gotoTab('home');  out.inicio = main(w);
  w.gotoTab('lib');   out.biblioteca = main(w);
  w.gotoTab('fav');   out.noveno = main(w);
  w.eval('setCollapsed={}'); w.gotoTab('set'); w.renderSet(); out.ajustes = main(w);
  w.renderAceptacion('ob'); out.aceptacion = main(w);
  for (const p of ['lang',0,1,2,3]){ w.renderOnboarding(p); out['bienvenida_'+p] = main(w); }
  if (w.eval('typeof FLUJO_OB') !== 'undefined'){   // const global: no cuelga de window
    for (const m of ['patron','azar','propio']){
      w.eval('ob.modo='+JSON.stringify(m)+'; ob.azar=null;');
      for (const p of w.eval('FLUJO_OB['+JSON.stringify(m)+']')){ w.renderOnboarding(p); out['bienvenida_'+m+'_'+p] = main(w); }
    }
    w.eval("ob.modo='patron'");
  }
  w.openEventForm(); out.momento = modal(w); w.closeModal();
  w.openEventForm(null,null,{soloConst:true}); out.profundizar = modal(w); w.closeModal();
  w.renderFullPractice('p001','lib'); out.practica = main(w);
  out.plan = JSON.stringify(w.getPlanFor('2026-09-07'));
  if (!nativo) out.calendario = w.generarICS().replace(/DTSTAMP:[0-9TZ]+/g,'DTSTAMP:-');
  w.close();
  return out;
}

(async ()=>{
  const r = { apk: await pantallas(true), web: await pantallas(false) };
  const [modo, archivo] = process.argv.slice(2);
  if (modo === '--guardar'){ fs.writeFileSync(archivo, JSON.stringify(r)); console.log('Instantáneas guardadas: '+Object.keys(r.apk).length+' pantallas × 2 modos'); process.exit(0); }
  if (modo === '--comparar'){
    const a = JSON.parse(fs.readFileSync(archivo,'utf8')); const dif = [];
    for (const m of ['apk','web']) for (const k of Object.keys(a[m])) if (a[m][k] !== r[m][k]) dif.push(m+'.'+k);
    console.log(dif.length ? 'DIFERENCIAS en: '+dif.join(', ') : 'IDÉNTICAS ('+Object.keys(a.apk).length+' pantallas × 2 modos)');
    process.exit(dif.length ? 1 : 0);
  }
  console.log('Uso: --guardar archivo | --comparar archivo'); process.exit(2);
})();
