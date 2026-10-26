# Avisos del Radar de subvenciones

[![Pruebas](https://github.com/felixcorcoran/alertas/actions/workflows/pruebas.yml/badge.svg)](https://github.com/felixcorcoran/alertas/actions/workflows/pruebas.yml)

Las ayudas nuevas que encajan con tu negocio, por email. Quien usa el [Radar de subvenciones](https://subvenciones.felixcorcoran.es) se apunta con el perfil de su negocio y, cada mañana, recibe las convocatorias publicadas desde el último aviso que le encajan, con lo que financian, el importe y el plazo.

**En marcha:** [alertas.felixcorcoran.es](https://alertas.felixcorcoran.es)

## Cómo funciona

1. **Alta con doble confirmación, desde el radar.** Al terminar sus preguntas, los resultados del radar ofrecen los avisos: solo falta el email. Una función de Vercel guarda la dirección como pendiente y envía un enlace para confirmarla. Un solo formulario, en un solo sitio. Sin confirmar no se envía nada, y a las 48 horas se borra.
2. **Pasada diaria.** Después de que el radar haya recogido y leído las convocatorias del día, GitHub Actions arranca la aplicación Spring Boot en modo pasada: lee el JSON del repositorio del radar, compara cada ayuda nueva (ya leída por la IA y abierta) con el negocio de cada persona y deja un aviso si encaja o hay que revisarla.
3. **Un correo por persona**, como mucho uno al día, con un tope diario para quedarse en el plan gratuito de Resend; lo que no cabe sale al día siguiente.
4. **Baja con un clic**, desde el pie de cada correo o desde el propio gestor de correo (`List-Unsubscribe`, RFC 8058). La baja borra la dirección y todo lo asociado.

## El mismo encaje que la web

La API tiene que decir lo mismo que el radar: si la web dice «Puedes pedirla», el correo también. El encaje (`EncajeService`) es una traducción frase por frase de `src/lib/encaje.ts` del radar, y `EncajeContratoTest` lo comprueba con 3.600 casos que calcula el código del radar (`herramientas/casos-encaje.mts`): convocatorias reales y de prueba, 60 negocios distintos, mismo estado y mismos motivos, uno a uno. Si cambia el encaje del radar, se vuelven a generar los casos y la prueba dice qué hay que cambiar aquí.

```sh
npx tsx herramientas/casos-encaje.mts ../subvenciones
```

## Cómo está hecho

Sin servidor encendido, para que cueste cero y no haga falta tarjeta en ningún sitio:

```
alertas.felixcorcoran.es (Vercel)
  ├─ panel Angular
  └─ /api/*  funciones de Vercel ──┐
                                   ├─ PostgreSQL (Neon)
GitHub Actions, cada mañana        │
  └─ Spring Boot en modo pasada ───┘──→ correos (Resend)
```

- **Spring Boot (Java 25, Spring Boot 4):** la parte con la lógica. Data JPA y PostgreSQL con migraciones de Flyway (dueñas del esquema), el encaje, el reparto y los correos de avisos por la API HTTP de Resend. Cada mañana `.github/workflows/avisos.yml` lo arranca con `--alertas.pasada=true`, sin servidor web: hace la pasada y termina.
- **La API REST de Spring Boot también está completa** (alta, confirmación, cambios, baja con un clic y la pasada por HTTP), con sus pruebas y un Dockerfile, lista para desplegarse en un contenedor. En producción esas mismas rutas las sirven funciones de Vercel (`web/api/`), que responden igual: así no hace falta tener un servidor encendido para cuatro peticiones al día. Las pruebas de las dos versiones comprueban los mismos casos.
- **Panel:** Angular 21 (componentes standalone, signals, sin zone.js) para lo que va después del correo: confirmar, cambiar el negocio y la baja. «Cambiar mi negocio» es el mismo asistente del radar, pregunta a pregunta, con las siluetas de comunidades y provincias (`datos/formas.json`) y los municipios para autocompletar (`web/public/municipios`), copiados del radar. Cabecera, pie y tema de [felixcorcoran.es](https://felixcorcoran.es).
- **Pruebas:** JUnit con un PostgreSQL embebido de verdad (sin Docker), MockMvc y un reloj controlable para las 48 horas y el tope diario; Vitest en el panel y en las funciones. GitHub Actions las pasa en cada push, junto al build de la imagen Docker.
- **Coste: cero.** Vercel, Neon, Resend y GitHub Actions en sus planes gratuitos.

```
api/src/main/java/es/felixcorcoran/alertas/
  encaje/          el encaje con el negocio (igual que el radar) y el catálogo
  suscripciones/   alta, confirmación, cambios y baja
  avisos/          la pasada diaria: reparto y envío
  correo/          plantillas y envío por Resend
  convocatorias/   lectura del JSON del radar
web/src/app/       el panel: portada, confirmar, gestionar (con el asistente), baja, privacidad
web/api/           las funciones de Vercel: alta, confirmación, cambios y baja
datos/             provincias y sectores, compartidos por la API y el panel
```

## Privacidad

Solo se guarda el email, el perfil del negocio (las mismas respuestas que el radar, sin nombre ni empresa), unas fechas y qué ayudas se han enviado. De la IP solo se guarda su huella (SHA-256) diez minutos, para frenar abusos. El enlace de cada persona lleva un token aleatorio de 256 bits, que es la única llave a sus datos, y la respuesta al apuntarse es la misma esté o no la dirección: no sirve para averiguar quién está apuntado. Detalle en [/privacidad](https://alertas.felixcorcoran.es/privacidad).

## En local

Hace falta JDK 25 y Node 24.

```sh
cd api && ./mvnw spring-boot:test-run   # API en :8080, PostgreSQL embebido en :5433, correos en el log
cd web && npm install && npm start      # panel en :4200 (pasa /api a :8080)
```

En local el panel habla con la API Spring Boot, que responde igual que las funciones de Vercel. Sin `RESEND_API_KEY` los correos no se envían: se escriben en el log y el HTML queda en `api/target/correos`. Para lanzar la pasada diaria a mano, arranca la API con `ALERTAS_CLAVE_AVISOS=local` y:

```sh
curl -X POST localhost:8080/api/avisos -H "Authorization: Bearer local"
```

Pruebas: `cd api && ./mvnw verify`, `cd web && npx ng test` y `npm run test:api` (las funciones).

## Despliegue

- **Vercel:** proyecto con raíz `web/`, conectado a este repositorio. Variables: `DATABASE_URL` (la cadena de conexión de Neon) y `RESEND_API_KEY`.
- **GitHub Actions:** secretos `DATABASE_URL` y `RESEND_API_KEY` (los mismos) para la pasada diaria. La primera ejecución (a mano, desde la pestaña Actions) crea las tablas.

---

Hecho por [Félix Corcoran](https://dev.felixcorcoran.es). Los resúmenes de las ayudas son orientativos: lo que vale es la convocatoria oficial.
