/* Escáner de vocabulario con riesgo legal en TODA la app.
   Revisa: biblioteca (ES/EN), diccionarios de idioma, textos del Noveno Camino,
   citas, plantilla de prácticas, manifiesto y service worker.
   Distingue las zonas donde ese vocabulario PROTEGE (aviso legal) de aquellas
   donde EXPONE (descripción de la app o de una práctica). */
const fs = require('fs');
const RAIZ = require('path').join(__dirname, '..', '..', 'www') + require('path').sep;
const html = fs.readFileSync(RAIZ + 'index.html', 'utf8') + '\n'
           + fs.readFileSync(RAIZ + 'i18n.js', 'utf8') + '\n'
           + fs.readFileSync(RAIZ + 'contenido.js', 'utf8');
const [ES, EN] = eval(fs.readFileSync(RAIZ + 'practices.js','utf8') + ';[PRACTICES_ES, PRACTICES_EN]');

const GRUPOS = [
 ['A · Servicio clínico o profesional',
  /\b(sanaci[oó]n|sanador[ae]?s?|sanar|sanad[ao]s?|autosanaci[oó]n|terapias?|terap[eé]utic[ao]s?|terapeutas?|tratamientos?|tratar\b|curaci[oó]n|curativ[ao]s?|curar\b|\bcura\b|remedios?|medicinal(es)?|f[aá]rmacos?|receta(r|s)?\b|dosis|posolog[ií]a|diagn[oó]stic[ao]s?|diagnosticar|pron[oó]stico|pacientes?|cl[ií]nic[ao]s?|consulta m[eé]dica)\b/gi,
  /\b(healing|heals?|healer|self-?healing|therapy|therapies|therapeutic|therapist|treatments?|\btreat\b|treats|cures?|curative|remedy|medicinal|drugs?|prescri(be|ption)|dosage|diagnos(is|e|tic)|prognosis|patients?|clinical)\b/gi],

 ['B · Enfermedades y trastornos',
  /\b(enfermedad(es)?|dolencias?|patolog[ií]as?|trastornos?|s[ií]ndromes?|s[ií]ntomas?|depresi[oó]n|depresiv[ao]|insomnio|migra[ñn]as?|jaquecas?|artritis|hipertensi[oó]n|diabetes|asma|alergias?|inflamaci[oó]n|infecci[oó]n|c[aá]ncer|tumor|fibromialgia|[uú]lcera|gastritis|ci[aá]tica|adicci[oó]n|fobias?|psicosis|neurosis|bipolar|ansiedad cl[ií]nica)\b/gi,
  /\b(diseases?|illness(es)?|disorders?|syndromes?|symptoms?|depression|insomnia|migraines?|arthritis|hypertension|diabetes|asthma|allerg(y|ies)|inflammation|infections?|cancer|tumou?r|fibromyalgia|ulcer|gastritis|sciatica|addiction|phobias?|psychosis|neurosis|bipolar)\b/gi],

 ['C · Promesas de efecto sobre el cuerpo',
  /\b(alivia(r|n)?|elimina el dolor|quita el dolor|reduce (el|la|los|las)|disminuye (el|la)|baja la (tensi[oó]n|presi[oó]n)|regula (la|el|las|los)|mejora (la|el|los|las)|fortalece (el|la|los|las)|refuerza (el|la|las|los)|sistema inmun\w*|inmunitari[ao]|defensas|desintoxica|detox|elimina toxinas|purifica la sangre|hormonal|cortisol|serotonina|dopamina|melatonina|adrenalina|metabolismo|presi[oó]n arterial|tensi[oó]n arterial|ritmo card[ií]aco|frecuencia card[ií]aca|sistema nervioso (aut[oó]nomo|simp[aá]tico|parasimp[aá]tico)|parasimp[aá]tico|oxigena la sangre|memoria celular)\b/gi,
  /\b(relieves?|eases the pain|lowers (blood|the)|reduces (stress|anxiety|pain|tension)|improves (circulation|digestion|sleep)|strengthens the|boosts? (the )?immune|immune system|defenses|detox|eliminates toxins|purifies the blood|hormonal|cortisol|serotonin|dopamine|melatonin|adrenaline|metabolism|blood pressure|heart rate|parasympathetic|autonomic nervous system|oxygenates|cellular memory)\b/gi],

 ['D · Marco terapéutico blando',
  /\b(beneficios? para la salud|para tu salud|salud (f[ií]sica|mental)|efectos secundarios|contraindicad[ao]s?|energ[ií]a curativa|poder curativo|proceso de sanaci[oó]n|sesi[oó]n de sanaci[oó]n|sana(r|ci[oó]n) (interior|emocional))\b/gi,
  /\b(health benefits?|for your health|(physical|mental) health|side effects|contraindicated|healing (energy|power|process))\b/gi],
];

// Zonas donde el vocabulario sanitario es PROTECTOR y debe conservarse
const ZONAS_OK = [['const ACEPT_ES','function ACEPT()'], ['const ACEPT_EN','function ACEPT()']];
const rangos = ZONAS_OK.map(([a,b])=>{ const i=html.indexOf(a); return [i, i<0?-1:html.indexOf(b,i)]; }).filter(r=>r[0]>=0);
const enZonaOk = pos => rangos.some(([a,b])=>pos>=a && pos<=b);

const hallazgos = [];
function anota(grupo, donde, id, frag, texto, protector){
  hallazgos.push({grupo, donde, id, frag, ctx: texto.replace(/\s+/g,' ').trim().slice(0,130), protector});
}

// ---- 1. Biblioteca ----
[[ES,'ES',0],[EN,'EN',1]].forEach(([arr,lang,k])=>{
  arr.forEach(p=>{
    GRUPOS.forEach(([g, reES, reEN])=>{
      const re = new RegExp((k? reEN : reES).source, 'gi');
      [['título',p.title],['texto',p.text]].forEach(([campo,t])=>{
        let m; while((m = re.exec(t))){
          const around = t.slice(Math.max(0,m.index-60), m.index+70);
          anota(g, 'Biblioteca '+lang+' ('+campo+')', p.id+' · '+(k?EN:ES).find(x=>x.id===p.id).title.slice(0,42), m[0], around, false);
        }
      });
    });
  });
});

// ---- 2. index.html completo (interfaz, legal, Noveno Camino, citas, plantilla) ----
GRUPOS.forEach(([g, reES, reEN])=>{
  [reES, reEN].forEach(base=>{
    const re = new RegExp(base.source, 'gi');
    let m; while((m = re.exec(html))){
      const linea = html.slice(0, m.index).split('\n').length;
      const around = html.slice(Math.max(0,m.index-70), m.index+80);
      // saltar comentarios del código
      const lineaTxt = html.split('\n')[linea-1] || '';
      if (/^\s*(\/\/|\*)/.test(lineaTxt)) continue;
      anota(g, 'index.html', 'línea '+linea, m[0], around, enZonaOk(m.index));
    }
  });
});

// ---- 3. manifiesto y service worker ----
['manifest.webmanifest','sw.js'].forEach(f=>{
  let t=''; try{ t=fs.readFileSync(RAIZ+f,'utf8'); }catch(e){ return; }
  GRUPOS.forEach(([g, reES, reEN])=>{
    [reES,reEN].forEach(base=>{
      const re=new RegExp(base.source,'gi'); let m;
      while((m=re.exec(t))) anota(g, f, '—', m[0], t.slice(Math.max(0,m.index-60), m.index+70), false);
    });
  });
});

// ---- informe ----
const expuestos = hallazgos.filter(h=>!h.protector);
const protegidos = hallazgos.filter(h=>h.protector);
console.log('===== VOCABULARIO CON RIESGO LEGAL =====\n');
if (!expuestos.length) console.log('Sin hallazgos que expongan.\n');
const porGrupo = {};
expuestos.forEach(h=>{ (porGrupo[h.grupo] = porGrupo[h.grupo] || []).push(h); });
Object.entries(porGrupo).forEach(([g, lista])=>{
  console.log('### ' + g + '  (' + lista.length + ')');
  lista.forEach(h=>{
    console.log('  · «' + h.frag + '»  en ' + h.donde + ' — ' + h.id);
    console.log('      …' + h.ctx + '…');
  });
  console.log('');
});
console.log('--- En el aviso legal (deben CONSERVARSE): ' + protegidos.length + ' apariciones ---');
console.log('    ' + [...new Set(protegidos.map(h=>h.frag.toLowerCase()))].join(', '));
