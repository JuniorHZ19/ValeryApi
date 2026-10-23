# Valex API

API REST (Next.js, route handlers) + **PostgreSQL** de **Creaciones Valery's**. La web pública y el panel de
administración están en el proyecto Angular `../Valex`.

📄 Referencia completa de endpoints: [docs/API.md](docs/API.md) · Peticiones de ejemplo: [docs/requests.http](docs/requests.http)

## Desarrollo local

Se usan dos terminales:

```bash
npm install
cp .env.example .env.local   # completa JWT_SECRET y ADMIN_PASSWORD

# Terminal 1: PostgreSQL 18 local (no hace falta instalarlo; la primera vez lo crea en data/postgres)
npm run db:start

# Terminal 2
npm run db:migrate           # crea las tablas y carga los datos iniciales
npm run dev                  # API en http://localhost:5058
```

| Script | Qué hace |
|---|---|
| `npm run db:start` | Arranca PostgreSQL en `localhost:5433` (Ctrl+C lo detiene) |
| `npm run db:migrate` | Aplica las migraciones pendientes y carga los datos iniciales si la base está vacía |
| `npm run db:info` | Muestra las tablas, columnas y cantidad de filas |
| `npm run db:reset -- --yes` | **Borra todo** y lo recrea desde cero |

La API también migra sola en la primera petición, así que en Vercel no hay que correr nada a mano.

## Base de datos

```
site_settings      información del negocio (1 sola fila)
categories         categorías de productos (Peluches, Ropa...)
products           catálogo; image_url guarda solo la URL de la imagen; category_id → categories
product_details    detalles de cada producto, en orden (FK → products, ON DELETE CASCADE)
content_items      bloques de la portada (highlight | step | occasion)
schema_migrations  migraciones aplicadas
```

Incluye restricciones (`CHECK`, `UNIQUE`, claves foráneas), un índice para el catálogo público y un trigger
que mantiene `updated_at`. Definición: [src/lib/db/migrations.ts](src/lib/db/migrations.ts).
Para cambiar el esquema, **agrega una migración nueva**; no edites las que ya se aplicaron.

## Despliegue en Vercel

1. Sube esta carpeta a un repositorio y créalo como proyecto en Vercel (framework: Next.js).
2. En **Storage**, agrega:
   - **Neon (Postgres)** → crea `DATABASE_URL`. Las tablas se crean solas en la primera petición.
   - **Blob** → crea `BLOB_READ_WRITE_TOKEN`.
3. En **Settings → Environment Variables** agrega:
   - `JWT_SECRET`: 32+ caracteres aleatorios, por ejemplo `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
   - `ADMIN_USERNAME` y `ADMIN_PASSWORD`: una contraseña **distinta** a la de desarrollo.
   - `CORS_ORIGINS`: la URL de la web Angular.
4. Despliega y pon la URL de la API en el proyecto Vercel del frontend, como variable `API_URL`.

## Límites conocidos

- El límite de intentos de login (5 por minuto e IP) vive en memoria: en Vercel cada instancia lleva su
  propia cuenta. Para un límite estricto haría falta un almacén compartido (por ejemplo, Upstash Redis).
- La conexión con Neon y con Vercel Blob no se ha probado todavía: en local se probó PostgreSQL 18 y el disco.
