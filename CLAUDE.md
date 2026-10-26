# alertas (Avisos del Radar de subvenciones)

Avisos por email de ayudas que encajan con un negocio (alertas.felixcorcoran.es). Monorepo:

- `api/`: Spring Boot 4, Java 25, Data JPA, PostgreSQL (Neon), Flyway, Resend.
- `web/`: panel Angular 21 (standalone, signals, sin zone.js) + `web/api/` funciones de Vercel.
- `datos/`: provincias, sectores y `formas.json`, compartidos por api y web.
- `herramientas/casos-encaje.mts`: genera los casos de contrato desde `../subvenciones`.

Más detalle (arquitectura, privacidad, despliegue) en `README.md`.

## Cómo encaja todo

- Producción: las rutas `/api/*` las sirven **las funciones de Vercel** (`web/api/`), no Spring.
  La API REST de Spring hace lo mismo y se usa en local y en pruebas. **Un cambio de endpoint se
  hace en los dos sitios** y las pruebas de ambos deben cubrir los mismos casos.
- La pasada diaria: `.github/workflows/avisos.yml` arranca Spring con `--alertas.pasada=true`.
- `api/src/main/java/es/felixcorcoran/alertas/`: `encaje/`, `suscripciones/`, `avisos/`,
  `correo/`, `convocatorias/`, `web/` (CORS, límite por IP).

## Reglas

- **`EncajeService` = traducción frase por frase de `../subvenciones/src/lib/encaje.ts`.**
  `EncajeContratoTest` lo verifica con `api/src/test/resources/encaje/casos.json` (no editar a
  mano; regenerar con `npx tsx herramientas/casos-encaje.mts ../subvenciones`).
- El esquema es de Flyway: cambios solo con una migración nueva `V{n}__*.sql`, nunca editar las
  existentes.
- Privacidad: solo email, perfil, fechas y ayudas enviadas. IP solo como hash 10 min. La respuesta
  al alta es igual exista o no el email. No añadir datos personales sin actualizar `/privacidad`.
- Coste cero: tope diario de correos de Resend, sin servidores encendidos.

## Comandos

- API: `cd api && ./mvnw spring-boot:test-run` (:8080, PostgreSQL embebido :5433; sin
  `RESEND_API_KEY` los correos van a `api/target/correos`).
- Panel: `cd web && npm start` (:4200, proxy a :8080).
- Pruebas: `cd api && ./mvnw verify`, `cd web && npx ng test`, `cd web && npm run test:api`.
- En Windows usar `mvnw.cmd` si `./mvnw` no funciona.

No leer: `api/target/`, `node_modules/`, `.angular/`, `dist/`.
