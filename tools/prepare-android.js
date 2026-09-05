// Ajusta el proyecto Android generado: permisos, iconos y APK autocontenido
const fs = require('fs'), path = require('path');

// 0. Version minima de Android.
//    Capacitor 6 genera minSdkVersion 22 (Android 5.1). Android 14 y posteriores
//    RECHAZAN instalar aplicaciones con minSdk menor que 23 y muestran "el paquete
//    parece no valido", aunque el APK este bien firmado y completo. Se sube a 23,
//    que solo deja fuera Android 5.x (menos del 1% de los moviles en uso).
try {
  const vg = 'android/variables.gradle';
  if (fs.existsSync(vg)) {
    let v = fs.readFileSync(vg, 'utf8');
    const antes = v;
    v = v.replace(/minSdkVersion\s*=\s*\d+/, 'minSdkVersion = 23');
    if (v === antes && !/minSdkVersion/.test(v))
      v = v.replace(/ext\s*\{/, 'ext {\n    minSdkVersion = 23');
    fs.writeFileSync(vg, v);
    console.log('minSdkVersion fijado en 23 (Android 14 rechaza menos de 23)');
  }
} catch (e) { console.log('no se pudo ajustar minSdkVersion:', e.message); }

// 1. Permisos: notificaciones y alarmas exactas
const man = 'android/app/src/main/AndroidManifest.xml';
let m = fs.readFileSync(man, 'utf8');
if (!m.includes('SCHEDULE_EXACT_ALARM')) {
  m = m.replace('</manifest>',
`    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
</manifest>`);
  fs.writeFileSync(man, m);
}

// 2. Iconos del logo en todas las densidades
const src = 'resources/android';
for (const dpi of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']) {
  const dst = `android/app/src/main/res/mipmap-${dpi}`;
  for (const f of ['ic_launcher.png','ic_launcher_round.png','ic_launcher_foreground.png']) {
    const from = path.join(src, `mipmap-${dpi}`, f);
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dst, f));
  }
}
fs.copyFileSync(path.join(src, 'ic_launcher_background.xml'),
  'android/app/src/main/res/values/ic_launcher_background.xml');
console.log('Proyecto Android preparado: permisos e iconos aplicados');

// 3. Canal de ALARMA nativo: crea el canal con audio de tipo ALARMA (suena aunque el
//    móvil esté en silencio o en No molestar), algo que no es posible desde JavaScript.
const mainAct = 'android/app/src/main/java/com/novecami/moment/MainActivity.java';
fs.writeFileSync(mainAct, `package com.novecami.moment;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import java.util.Locale;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(AjustesPlugin.class);
    super.onCreate(savedInstanceState);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      try {
        NotificationManager nm = getSystemService(NotificationManager.class);
        AudioAttributes attrs = new AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build();
        // Idioma de arranque: se toman las lenguas cooficiales de Espana como espanol,
        // igual que hace la app. Es solo el valor inicial: en cuanto carga la interfaz,
        // renombrarCanal lo ajusta al idioma ELEGIDO dentro de la app.
        String lg = Locale.getDefault().getLanguage();
        boolean esIdioma = lg.equals("es") || lg.equals("ca") || lg.equals("gl") || lg.equals("eu");
        NotificationChannel ch = new NotificationChannel(
          "momento_despertador",
          esIdioma ? "Moment (alarma)" : "Moment (alarm)",
          NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(esIdioma
          ? "Avisos que suenan aunque el movil este en silencio"
          : "Reminders that ring even when the phone is on silent");
        ch.setSound(Settings.System.DEFAULT_ALARM_ALERT_URI, attrs);
        ch.setBypassDnd(true);
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
      } catch (Exception e) { /* nunca debe impedir el arranque */ }
    }
  }
}
`);
console.log('Canal de alarma nativo inyectado en MainActivity');

// 4. Plugin nativo "Ajustes": permite abrir desde JavaScript el ajuste de batería de la app,
//    para autorizar el uso en segundo plano (necesario en OPPO/realme/Xiaomi/etc.)
const plugAct = 'android/app/src/main/java/com/novecami/moment/AjustesPlugin.java';
fs.writeFileSync(plugAct, `package com.novecami.moment;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Base64;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Ajustes")
public class AjustesPlugin extends Plugin {
  @PluginMethod
  public void renombrarCanal(PluginCall call) {
    // Renombra el canal de alarma con el idioma ELEGIDO EN LA APP (no el del sistema).
    // Volver a crear un canal con el mismo id solo actualiza su nombre y descripcion.
    String nombre = call.getString("nombre", "");
    String descripcion = call.getString("descripcion", "");
    try {
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O && !nombre.isEmpty()) {
        android.app.NotificationManager nm = getContext().getSystemService(android.app.NotificationManager.class);
        android.media.AudioAttributes attrs = new android.media.AudioAttributes.Builder()
          .setUsage(android.media.AudioAttributes.USAGE_ALARM)
          .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build();
        android.app.NotificationChannel ch = new android.app.NotificationChannel(
          "momento_despertador", nombre, android.app.NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription(descripcion);
        ch.setSound(android.provider.Settings.System.DEFAULT_ALARM_ALERT_URI, attrs);
        ch.setBypassDnd(true);
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
      }
      call.resolve();
    } catch (Exception e) { call.resolve(); }
  }

  @PluginMethod
  public void listarArchivosMoment(PluginCall call) {
    // Busca en la carpeta Descargas los archivos que puede usar la app: copias de
    // seguridad, idiomas y practicas. Solo LEE, y solo archivos pequenos: no toca
    // nada mas del telefono. Devuelve nombre, fecha y contenido en base64.
    try {
      JSArray salida = new JSArray();
      final long MAX = 3L * 1024 * 1024;   // 3 MB: mas grande no es un archivo nuestro
      String[] cols = new String[]{
        android.provider.MediaStore.Downloads._ID,
        android.provider.MediaStore.Downloads.DISPLAY_NAME,
        android.provider.MediaStore.Downloads.SIZE,
        android.provider.MediaStore.Downloads.DATE_MODIFIED };
      android.content.ContentResolver cr = getContext().getContentResolver();
      android.net.Uri base = (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q)
        ? android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI
        : android.provider.MediaStore.Files.getContentUri("external");
      String sel = android.provider.MediaStore.Downloads.DISPLAY_NAME + " LIKE ? OR "
                 + android.provider.MediaStore.Downloads.DISPLAY_NAME + " LIKE ? OR "
                 + android.provider.MediaStore.Downloads.DISPLAY_NAME + " LIKE ?";
      String[] args = new String[]{ "%moment%.json", "%momento%.json", "%practica%.json" };
      android.database.Cursor c = cr.query(base, cols, sel, args,
        android.provider.MediaStore.Downloads.DATE_MODIFIED + " DESC");
      if (c != null) {
        int n = 0;
        while (c.moveToNext() && n < 20) {
          long id = c.getLong(0);
          String nombre = c.getString(1);
          long tam = c.getLong(2);
          if (tam <= 0 || tam > MAX) continue;
          android.net.Uri uri = android.content.ContentUris.withAppendedId(base, id);
          try {
            java.io.InputStream in = cr.openInputStream(uri);
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[8192]; int leidos;
            while ((leidos = in.read(buf)) > 0) bos.write(buf, 0, leidos);
            in.close();
            JSObject o = new JSObject();
            o.put("nombre", nombre);
            o.put("tamano", tam);
            o.put("fecha", c.getLong(3));
            o.put("base64", android.util.Base64.encodeToString(bos.toByteArray(), android.util.Base64.NO_WRAP));
            salida.put(o);
            n++;
          } catch (Exception e) { }
        }
        c.close();
      }
      JSObject r = new JSObject();
      r.put("archivos", salida);
      call.resolve(r);
    } catch (Exception e) {
      call.reject("no se pudo leer Descargas");
    }
  }

  @PluginMethod
  public void infoDispositivo(PluginCall call) {
    // Datos tecnicos del telefono para diagnosticar incidencias. Todos vienen de
    // android.os.Build y de la configuracion: no requieren ningun permiso, no
    // identifican a la persona y no salen del movil salvo que el usuario envie el correo.
    try {
      JSObject r = new JSObject();
      r.put("fabricante", android.os.Build.MANUFACTURER);
      r.put("marca", android.os.Build.BRAND);
      r.put("modelo", android.os.Build.MODEL);
      r.put("dispositivo", android.os.Build.DEVICE);
      r.put("android", android.os.Build.VERSION.RELEASE);
      r.put("sdk", android.os.Build.VERSION.SDK_INT);
      try {
        android.content.pm.PackageInfo pi = getContext().getPackageManager()
          .getPackageInfo(getContext().getPackageName(), 0);
        r.put("versionApp", pi.versionName);
      } catch (Exception e) { }
      try {
        android.util.DisplayMetrics dm = getContext().getResources().getDisplayMetrics();
        r.put("pantalla", dm.widthPixels + "x" + dm.heightPixels);
        r.put("densidad", dm.density);
      } catch (Exception e) { }
      try {
        android.app.NotificationManager nm = getContext().getSystemService(android.app.NotificationManager.class);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
          r.put("nomolestar", nm.getCurrentInterruptionFilter());
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
          android.app.NotificationChannel ch = nm.getNotificationChannel("momento_despertador");
          r.put("canalAlarma", ch == null ? "no existe" : ("importancia " + ch.getImportance()));
        }
      } catch (Exception e) { }
      try {
        android.os.PowerManager pm = (android.os.PowerManager) getContext().getSystemService(android.content.Context.POWER_SERVICE);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
          r.put("bateriaExenta", pm.isIgnoringBatteryOptimizations(getContext().getPackageName()));
        }
      } catch (Exception e) { }
      call.resolve(r);
    } catch (Exception e) {
      call.reject("sin datos");
    }
  }

  @PluginMethod
  public void guardarDescarga(PluginCall call) {
    // Guarda el archivo DIRECTAMENTE en la carpeta Descargas del movil, sin pasar
    // por el menu de compartir. En Android 10+ se usa MediaStore (no requiere
    // permisos); en versiones anteriores se escribe en la carpeta publica.
    String nombre = call.getString("nombre", "archivo");
    String base64 = call.getString("base64", "");
    String mime = call.getString("mime", "application/octet-stream");
    try {
      byte[] datos = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
        android.content.ContentValues cv = new android.content.ContentValues();
        cv.put(android.provider.MediaStore.Downloads.DISPLAY_NAME, nombre);
        cv.put(android.provider.MediaStore.Downloads.MIME_TYPE, mime);
        cv.put(android.provider.MediaStore.Downloads.IS_PENDING, 1);
        android.content.ContentResolver cr = getContext().getContentResolver();
        Uri uri = cr.insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
        if (uri == null) { call.reject("sin destino"); return; }
        java.io.OutputStream os = cr.openOutputStream(uri);
        os.write(datos); os.close();
        cv.clear();
        cv.put(android.provider.MediaStore.Downloads.IS_PENDING, 0);
        cr.update(uri, cv, null, null);
      } else {
        File dir = android.os.Environment.getExternalStoragePublicDirectory(
          android.os.Environment.DIRECTORY_DOWNLOADS);
        if (!dir.exists()) dir.mkdirs();
        File f = new File(dir, nombre);
        FileOutputStream fos = new FileOutputStream(f);
        fos.write(datos); fos.close();
        // avisar al sistema para que aparezca en el gestor de archivos
        Intent scan = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
        scan.setData(Uri.fromFile(f));
        getContext().sendBroadcast(scan);
      }
      call.resolve();
    } catch (Exception e) {
      call.reject("no se pudo guardar");
    }
  }

  @PluginMethod
  public void compartirArchivo(PluginCall call) {
    // comparte un archivo declarando su tipo real (MIME): asi el menu de compartir
    // ofrece Word, Documentos, Drive, etc. en vez de tratarlo como archivo generico
    String nombre = call.getString("nombre", "archivo");
    String base64 = call.getString("base64", "");
    String mime = call.getString("mime", "application/octet-stream");
    String titulo = call.getString("titulo", "Compartir");
    try {
      byte[] datos = Base64.decode(base64, Base64.DEFAULT);
      File dir = new File(getContext().getCacheDir(), "compartir");
      if (!dir.exists()) dir.mkdirs();
      File f = new File(dir, nombre);
      FileOutputStream fos = new FileOutputStream(f);
      fos.write(datos);
      fos.close();
      Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
      Intent i = new Intent(Intent.ACTION_SEND);
      i.setType(mime);
      i.putExtra(Intent.EXTRA_STREAM, uri);
      i.putExtra(Intent.EXTRA_TITLE, nombre);
      i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      Intent chooser = Intent.createChooser(i, titulo);
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getActivity().startActivity(chooser);
      call.resolve();
    } catch (Exception e) {
      call.reject("no se pudo compartir");
    }
  }

  @PluginMethod
  public void abrirPantalla(PluginCall call) {
    // abre una pantalla concreta de los ajustes del sistema
    String tipo = call.getString("tipo", "app");
    String pkg = getContext().getPackageName();
    try {
      Intent i;
      if ("bateria_general".equals(tipo)) {
        i = new Intent(Intent.ACTION_POWER_USAGE_SUMMARY);
      } else if ("sonido".equals(tipo)) {
        i = new Intent(Settings.ACTION_SOUND_SETTINGS);
      } else if ("canal".equals(tipo)) {
        i = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS);
        i.putExtra(Settings.EXTRA_APP_PACKAGE, pkg);
        i.putExtra(Settings.EXTRA_CHANNEL_ID, "momento_despertador");
      } else {
        i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        i.setData(Uri.parse("package:" + pkg));
      }
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getActivity().startActivity(i);
      call.resolve();
    } catch (Exception e) {
      try {
        Intent i2 = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        i2.setData(Uri.parse("package:" + pkg));
        getActivity().startActivity(i2);
        call.resolve();
      } catch (Exception e2) { call.reject("no disponible"); }
    }
  }

  @PluginMethod
  public void estadoBateria(PluginCall call) {
    JSObject r = new JSObject();
    try {
      PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
      r.put("exenta", pm.isIgnoringBatteryOptimizations(getContext().getPackageName()));
    } catch (Exception e) { r.put("exenta", false); }
    call.resolve(r);
  }

  @PluginMethod
  public void abrirAutoarranque(PluginCall call) {
    // pantallas propietarias de autoarranque de cada fabricante (capa extra a la bateria)
    String[][] comps = {
      {"com.oplus.safecenter","com.oplus.safecenter.startupapp.StartupAppListActivity"},
      {"com.oplus.safecenter","com.oplus.safecenter.permission.startup.StartupAppListActivity"},
      {"com.oplus.battery","com.oplus.battery.BatteryActivity"},
      {"com.coloros.safecenter","com.coloros.safecenter.startupapp.StartupAppListActivity"},
      {"com.coloros.safecenter","com.coloros.safecenter.permission.startup.StartupAppListActivity"},
      {"com.oppo.safe","com.oppo.safe.permission.startup.StartupAppListActivity"},
      {"com.miui.securitycenter","com.miui.permcenter.autostart.AutoStartManagementActivity"},
      {"com.vivo.permissionmanager","com.vivo.permissionmanager.activity.BgStartUpManagerActivity"},
      {"com.huawei.systemmanager","com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
      {"com.samsung.android.lool","com.samsung.android.sm.ui.battery.BatteryActivity"}
    };
    for (String[] c : comps) {
      try {
        Intent i = new Intent();
        i.setComponent(new ComponentName(c[0], c[1]));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(i);
        call.resolve();
        return;
      } catch (Exception e) { /* siguiente fabricante */ }
    }
    try {
      // respaldo universal: la ficha de la app (el autoarranque suele estar dentro)
      Intent i2 = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
      i2.setData(Uri.parse("package:" + getContext().getPackageName()));
      getActivity().startActivity(i2);
      call.resolve();
    } catch (Exception e2) { call.reject("no disponible"); }
  }

  @PluginMethod
  public void abrirBateria(PluginCall call) {
    try {
      PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
      boolean exenta = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
      Intent i;
      if (exenta) {
        // ya exenta: el dialogo de peticion no se mostraria; se abre la ficha de la app
        i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        i.setData(Uri.parse("package:" + getContext().getPackageName()));
      } else {
        // dialogo directo: "permitir que la app ignore la optimizacion de bateria"
        i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
        i.setData(Uri.parse("package:" + getContext().getPackageName()));
      }
      getActivity().startActivity(i);
      call.resolve();
    } catch (Exception e) {
      try {
        // respaldo: la ficha de la app en ajustes (Bateria esta dentro)
        Intent i2 = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        i2.setData(Uri.parse("package:" + getContext().getPackageName()));
        getActivity().startActivity(i2);
        call.resolve();
      } catch (Exception e2) { call.reject("no se pudo abrir"); }
    }
  }
}
`);
console.log('Plugin Ajustes (bateria) inyectado');

// 5. Pantalla de inicio nativa: NO debe verse como una pantalla aparte.
//    La plantilla de Capacitor usa el tema Theme.SplashScreen (libreria androidx
//    core-splashscreen). Esa libreria IGNORA android:background y pinta su propio
//    splash con sus atributos SIN prefijo: windowSplashScreenBackground (blanco por
//    defecto) + windowSplashScreenAnimatedIcon (el icono de la app). De ahi venia la
//    pantalla blanca con logo. La solucion es definir ESOS atributos: fondo del color
//    de nuestra portada (#2B241C) e icono transparente. La libreria los traslada al
//    splash del sistema en Android 12+ y los emula en versiones anteriores.
//    Todo va dentro de un try: un fallo aqui nunca debe tumbar la compilacion.
try {
  const resDir = 'android/app/src/main/res';

  // 5.1 Fuera los splash.png del andamiaje (evita recursos duplicados con splash.xml)
  for (const dir of fs.readdirSync(resDir)) {
    if (!dir.startsWith('drawable')) continue;
    const ruta = path.join(resDir, dir);
    if (!fs.statSync(ruta).isDirectory()) continue;
    for (const f of fs.readdirSync(ruta)) {
      if (/^(splash|logo_splash|splash_sin_icono)\./i.test(f)) fs.unlinkSync(path.join(ruta, f));
    }
  }

  fs.mkdirSync(resDir + '/drawable', { recursive: true });
  fs.mkdirSync(resDir + '/values', { recursive: true });

  // 5.2 Fondo liso del color de la portada (para versiones antiguas via windowBackground)
  fs.writeFileSync(resDir + '/drawable/splash.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="@color/splashFondo"/>
</shape>
`);

  // 5.3 Icono invisible para que el splash del sistema no dibuje el logo
  fs.writeFileSync(resDir + '/drawable/splash_sin_icono.xml', `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
  <solid android:color="#00000000"/>
</shape>
`);

  fs.writeFileSync(resDir + '/values/colors_splash.xml', `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="splashFondo">#2B241C</color>
</resources>
`);

  // 5.4 Sustituir el tema de arranque COMPLETO por uno con los atributos de la
  //     libreria (sin prefijo android:), que son los que de verdad gobiernan.
  const estilos = resDir + '/values/styles.xml';
  if (fs.existsSync(estilos)) {
    let st = fs.readFileSync(estilos, 'utf8');
    const re = /<style name="AppTheme\.NoActionBarLaunch"[^>]*>[\s\S]*?<\/style>/;
    if (re.test(st)) {
      st = st.replace(re, `<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/splashFondo</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/splash_sin_icono</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
        <item name="android:background">@drawable/splash</item>
        <item name="android:windowBackground">@drawable/splash</item>
    </style>`);
      fs.writeFileSync(estilos, st);
      // Ya no hace falta values-v31: la libreria traslada estos atributos al sistema
      const v31 = resDir + '/values-v31/styles.xml';
      if (fs.existsSync(v31)) fs.unlinkSync(v31);
      console.log('Splash nativo: fondo de la portada, sin logo (atributos de la libreria)');
    } else {
      console.log('Aviso: no se encontro el tema de arranque; splash sin tocar');
    }
  }
} catch (e) {
  console.log('Aviso: splash no configurado (' + e.message + '); la compilacion sigue');
}
