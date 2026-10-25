# Avisos del Radar de subvenciones

[![Pruebas](https://github.com/felixcorcoran/alertas/actions/workflows/pruebas.yml/badge.svg)](https://github.com/felixcorcoran/alertas/actions/workflows/pruebas.yml)

Las ayudas nuevas que encajan con tu negocio, por email. Quien usa el [Radar de subvenciones](https://subvenciones.felixcorcoran.es) se apunta con el perfil de su negocio y, cada mañana, recibe las convocatorias publicadas desde el último aviso que le encajan, con lo que financian, el importe y el plazo.

**En marcha:** [alertas.felixcorcoran.es](https://alertas.felixcorcoran.es)

## Cómo funciona

1. **Alta con doble confirmación.** El panel (Angular) manda el email y el perfil; la API guarda la dirección como pendiente y envía un enlace para confirmarla. Sin confirmar no se envía nada, y a las 48 horas se borra.
2. **Pasada diaria.** Un cron de GitHub Actions llama a la API después de que el radar haya recogido y leído las convocatorias del día. La API lee el JSON del repositorio del radar, compara cada ayuda nueva (ya leída por la IA y abierta) con el negocio de cada persona y deja un aviso si encaja o hay que revisarla.
3. **Un correo por persona**, como mucho uno al día, con un tope diario para quedarse en el plan gratuito de Resend; lo que no cabe sale al día siguiente.
4. **Baja con un clic**, desde el pie de cada correo o desde el propio gestor de correo (`List-Unsubscribe`, RFC 8058). La baja borra la dirección y todo lo asociado.

## El mismo encaje que la web

La API tiene que decir lo mismo que el radar: si la web dice «Puedes pedirla», el correo también. El encaje (`EncajeService`) es una traducción frase por frase de `src/lib/encaje.ts` del radar, y `EncajeContratoTest` lo comprueba con 3.600 casos que calcula el código del radar (`herramientas/casos-encaje.mts`): convocatorias reales y de prueba, 60 negocios distintos, mismo estado y mismos motivos, uno a uno. Si cambia el encaje del radar, se vuelven a generar los casos y la prueba dice qué hay que cambiar aquí.

```sh
npx tsx herramientas/casos-encaje.mts ../subvenciones
```

## Cómo está hecho

- **API:** Java 25 y Spring Boot 4 (Web MVC, Data JPA, Validation, Actuator), PostgreSQL con migraciones de Flyway. Los correos van por la API HTTP de Resend. Docker para Render.
- **Panel:** Angular 21 (componentes standalone, signals, sin zone.js, formularios reactivos tipados), en Vercel. Vercel pasa `/api` a Render: un solo dominio, sin CORS para el visitante y la baja con un clic en la misma dirección.
- **Pruebas:** JUnit con un PostgreSQL embebido de verdad (sin Docker), MockMvc y un reloj controlable para las 48 horas y el tope diario; Vitest en el panel. GitHub Actions las pasa en cada push, junto al build de la imagen Docker.
- **Coste: cero.** Render, Neon, Resend, Vercel y GitHub Actions en sus planes gratuitos. Render duerme la API si nadie la usa: el panel la despierta al abrirse y el cron reintenta.

```
api/src/main/java/es/felixcorcoran/alertas/
  encaje/          el encaje con el negocio (igual que el radar) y el catálogo
  suscripciones/   alta, confirmación, cambios y baja
  avisos/          la pasada diaria: reparto y envío
  correo/          plantillas y envío por Resend
  convocatorias/   lectura del JSON del radar
web/src/app/       el panel: alta, confirmar, gestionar, baja, privacidad
datos/             provincias y sectores, compartidos por la API y el panel
```

## Privacidad

Solo se guarda el email, el perfil del negocio (las mismas respuestas que el radar, sin nombre ni empresa), unas fechas y qué ayudas se han enviado. La IP solo se usa en memoria para frenar abusos. El enlace de cada persona lleva un token aleatorio de 256 bits, que es la única llave a sus datos, y la respuesta al apuntarse es la misma esté o no la dirección: no sirve para averiguar quién está apuntado. Detalle en [/privacidad](https://alertas.felixcorcoran.es/privacidad).

## En local

Hace falta JDK 25 y Node 24.

```sh
cd api && ./mvnw spring-boot:test-run   # API en :8080, PostgreSQL embebido en :5433, correos en el log
cd web && npm install && npm start      # panel en :4200 (pasa /api a :8080)
```

Sin `RESEND_API_KEY` los correos no se envían: se escriben en el log y el HTML queda en `api/target/correos`. Para lanzar la pasada diaria a mano, arranca la API con `ALERTAS_CLAVE_AVISOS=local` y:

```sh
curl -X POST localhost:8080/api/avisos -H "Authorization: Bearer local"
```

Pruebas: `cd api && ./mvnw verify` y `cd web && npx ng test`.

---

Hecho por [Félix Corcoran](https://dev.felixcorcoran.es). Los resúmenes de las ayudas son orientativos: lo que vale es la convocatoria oficial.
