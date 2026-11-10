# Twitter/X Media — un plugin de Kino para tus videos guardados de X (Twitter)

Este plugin convierte los **videos que guardaste en X** («Elementos guardados» / Bookmarks) en
títulos de Kino: aparecen en varias filas del Inicio y se abren en el reproductor de Kino. El plugin
está en la categoría «solo adultos» y cada video se marca 18+ (`adult: true`, la misma estructura
de ítems que el plugin de xHamster): Kino no lo guarda en «Mi biblioteca» ni en «Continuar viendo»,
así que no queda historial de lo que ves.

Incluye su **menú de inicio de sesión**: una ventana de X que se abre dentro de Kino para que entres
con tu cuenta, y un campo para pegar las cookies a mano cuando el aparato no puede abrir esa ventana.

## Qué necesitas

| Cosa | Detalle |
| --- | --- |
| Kino | 0.9.74 o más nuevo (el plugin declara `apiVersion` 14). |
| La ventana de inicio de sesión | 0.9.81 o más nuevo, en un teléfono, tableta o Android TV. En un Kino anterior, o en un aparato sin WebView (la app de escritorio), se entra pegando las cookies. |
| La pantalla «Buscar en X» | Kino con las pantallas de plugins activadas (Ajustes ▸ Apariencia / Plugins). Sale con el candado 18+ desbloqueado. |
| Una cuenta de X | La tuya. El plugin lee **tus** Elementos guardados; no lee los de nadie más. |

## Instalación

1. Publica esta carpeta como un repositorio público de GitHub con el topic `kino-plugin` (así sale en
   «De la comunidad»), o súbela a cualquier servidor https con su `kino-plugin.json`.
2. En Kino: **Ajustes ▸ Plugins ▸ Instalar** y escribe `owner/repo` (o pega la URL del
   `kino-plugin.json`).
3. Acepta la hoja de consentimiento: el plugin habla con `x.com`, `video.twimg.com` y los demás
   hosts de X que lista su manifiesto, y puede abrir una ventana web donde inicias sesión.

## Iniciar sesión

**Forma 1 — dentro de Kino (recomendada).** Ajustes ▸ **Twitter/X Media** ▸ **Iniciar sesión en X**.
Se abre la ventana de X; entra con tu cuenta y espera: la ventana se cierra sola cuando ya existen
las cookies de sesión, y Kino las guarda cifradas en el ajuste de sesión. La línea **Sesión** pasa a
«Conectado como @tuusuario».

**Forma 2 — pegando las cookies.** Si el aparato no puede abrir la ventana:

1. En un computador, abre x.com con la sesión iniciada.
2. F12 ▸ **Application** (Aplicación) ▸ **Cookies** ▸ `https://x.com`.
3. Copia el valor de `auth_token` y el de `ct0` y pégalos en **Sesión (cookies auth_token y ct0)** así:
   `auth_token=AAA…; ct0=BBB…`
4. **Guardar**. Kino comprueba la sesión antes de guardarla; si X la rechaza, te lo dice en el campo.

«Cerrar sesión» borra las cookies del plugin (y del jar de Kino). Son la llave de tu cuenta: no las
compartas con nadie, y ten en cuenta que Kino las sincroniza cifradas con tus otros aparatos.

## Qué ves en Kino

- **Inicio**: varias filas — Inicio (Para ti), Más del Inicio, tus videos guardados y más guardados
  (los tuits que no traen video se omiten). Las tarjetas **Ver más** abren cada lista completa, paginada.
- **Pantalla «Buscar en X»**: entra por el icono de lupa del plugin (barra lateral en el TV, franja de
  plugins en el teléfono) o desde su página de ajustes. Escribe un tópico o una persona y verás todos
  los videos públicos relacionados en una fila de tarjetas; el **Ver más** de esa fila pagina todos
  los resultados. Sin sesión, la propia pantalla trae el formulario para entrar. Es 18+: solo sale
  con el código desbloqueado, y sus resultados tampoco quedan en tu historial.
- **Reproductor**: la mejor copia MP4 disponible; en «Ahorro de datos», la más liviana. Si X solo
  ofrece HLS, Kino lo reproduce igual. Las otras resoluciones quedan en el menú **Servidor** del
  reproductor.
- **Búsqueda de Kino**: en tus guardados y en toda X. `@usuario` trae **todos los videos del perfil**
  (pestaña Multimedia), `#etiqueta` combina los recientes y los más populares, cualquier tópico o
  persona («Hinata Hyuga») trae **todos los videos relacionados de X primero** (recientes y
  populares, varias páginas) y después los guardados que coincidan, y los operadores de X (`from:`,
  `since:`, `min_faves:`, `lang:`…) se pasan tal cual. En «Buscar en» dentro de una fila de guardados
  o del Inicio, la búsqueda filtra esa lista; en otras listas filtra Kino.
- El póster y el fondo salen del fotograma que X publica para cada video; el título, de la primera
  línea del tuit; la sinopsis, del texto completo.

## Cómo funciona (y sus límites, dichos sin adornos)

- Con tu sesión, el plugin hace la **misma consulta interna que la web de X** para leer Elementos
  guardados, el Inicio y la búsqueda. X no publica esas consultas: no son una API estable ni
  documentada.
- X **cambia el identificador de esas consultas** cada tanto. Si eso pasa, el plugin intenta
  descubrir el nuevo leyendo los archivos JavaScript de la propia web de X (`abs.twimg.com`) y lo
  guarda una semana. Si aun así falla, el campo avanzado **Identificador de la API** de los ajustes
  permite pegarlo a mano.
- La URL de cada video se guarda en la caché del plugin (hasta 120 videos) para que reproducir no
  cueste otra petición. «Limpiar la caché de videos» la vacía.
- Solo videos: los tuits con fotos o solo texto no aparecen. No se pueden descargar (el plugin no
  declara `download`) y no hay DRM de por medio.
- Cuentas protegidas: el servicio público de X que se usa como respaldo para una URL suelta no ve
  esos tuits; en ese caso el plugin recorre tus guardados, que sí funcionan con tu sesión.
- Límites de X: si abres muchas páginas seguidas, X puede responder 429 y Kino lo mostrará como
  «demasiadas peticiones». Espera un minuto.
- Nada de esto es una afiliación con X. Es un cliente personal que lee tu propia cuenta.

## Privacidad

El plugin no tiene servidor propio ni telemetría: no declara `telemetry`, y todo lo que sale del
aparato va a hosts de X. Las cookies viajan solo a esos hosts, viven en un ajuste `password` de Kino
(cifrado en el Keystore del aparato y sellado de punta a punta al sincronizarse) y `kino.storage`
solo guarda el @usuario, el identificador de la consulta y las URLs de tus videos. El estado de la
pantalla «Buscar en X» vive en Kino y se borra con la conversación del plugin; nada de lo que buscas
o ves se guarda en «Mi biblioteca» ni en «Continuar viendo».

## Estructura

```
kino-plugin.json   manifiesto: hosts, capacidades, pantalla propia, ajustes y la ventana de inicio de sesión
plugin.js          el código: home, browse, search, resolve, screen, screenEvent, settingsStatus, action, validateSettings
icon.png           ícono cuadrado del plugin
README.md          esto
```

## Desarrollo

Con el kit oficial de Kino:

```
cp -r kino-plugin-sdk/sdk kino-plugin-sdk/contract.json kino-plugin-sdk/kino.d.ts .
node sdk/validate.mjs .
node sdk/run.mjs . settingsStatus
node sdk/run.mjs . action link
node sdk/run.mjs . home
```

`run.mjs` necesita una sesión real de X para las llamadas que hablan con x.com; sin ella responde
`auth_required`, que es lo esperado. El banco de pruebas de este repositorio (`.dev/test.mjs`, fuera
del plugin publicado) corre `home`, `browse`, `search`, `resolve`, `action`, `settingsStatus` y
`validateSettings` contra un `kino` falso, sin red.
