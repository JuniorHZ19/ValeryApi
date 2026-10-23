# Valex API — referencia de endpoints

Base URL local: `http://localhost:5058` · Formato: JSON (UTF-8) · Autenticación de admin: `Authorization: Bearer <token>`

## Convenciones

- **Imágenes:** la base de datos guarda solo la **URL** de cada imagen, nunca el archivo.
  - Las rutas relativas (`/images/doll-1.jpg`, `/uploads/x.jpg`) se sirven desde esta API.
  - En producción, las subidas devuelven URLs absolutas de Vercel Blob.
- **Precio:** `price: null` significa "precio a consultar".
- **Slug:** lo genera el servidor a partir del nombre ("Con su nombre" → `con-su-nombre`). Si se repite, se agrega `-2`, `-3`...
- **Errores:** siempre con el mismo formato:

```json
{ "title": "Datos inválidos.", "status": 400, "errors": [{ "field": "name", "message": "El nombre debe tener al menos 2 caracteres." }] }
```

| Código | Cuándo |
|---|---|
| 400 | JSON mal formado, validación o restricción de la base de datos |
| 401 | Falta el token, es inválido o expiró; o credenciales incorrectas |
| 404 | El recurso no existe (o el producto está oculto, en rutas públicas) |
| 409 | Conflicto de unicidad (por ejemplo, dos productos con el mismo slug a la vez) |
| 429 | Demasiados intentos de login (5 por minuto) |

---

## Autenticación

### `POST /api/auth/login` — público

Body:
```json
{ "username": "admin", "password": "••••••••" }
```
200:
```json
{ "token": "eyJhbGciOiJIUzI1NiJ9...", "expiresAt": "2026-10-23T03:00:00.000Z", "username": "admin" }
```
El token dura 8 horas.

---

## Información del negocio

### `GET /api/site` — público

200:
```json
{
  "name": "Creaciones Valery's",
  "tagline": "Amigurumis únicos y personalizados",
  "whatsappNumber": "51947191624",
  "whatsappDisplay": "947 191 624",
  "defaultMessage": "¡Hola Creaciones Valery's! Quiero un amigurumi personalizado.",
  "facebookUrl": "https://www.facebook.com/valerystejido",
  "instagramHandle": "@valerystejido",
  "instagramUrl": "https://www.instagram.com/valerystejido/",
  "location": "San Juan de Miraflores, Lima",
  "address": "Jr. Alejandro Tirado 290, San Juan de Miraflores, Perú 15803",
  "logoUrl": "/images/logo.jpg",
  "heroImageUrl": "/images/dolls-group.jpg"
}
```

### `PUT /api/site` — admin

Body: el mismo objeto completo. Reglas:
- **Obligatorios:** `name`, `whatsappDisplay`, `logoUrl`, `heroImageUrl`.
- `whatsappNumber`: solo dígitos, de 8 a 15.
- `facebookUrl` e `instagramUrl`: URL válida o vacío.

200: el objeto guardado.

---

## Contenido de la portada

### `GET /api/content` — público

200:
```json
{
  "highlights": [{ "id": 1, "icon": "hand", "title": "Hecho a mano", "text": "...", "sortOrder": 1 }],
  "steps":      [{ "id": 4, "icon": "chat", "title": "Escríbenos", "text": "...", "sortOrder": 1 }],
  "occasions":  [{ "id": 8, "icon": "cake", "title": "Cumpleaños", "text": "", "sortOrder": 1 }]
}
```

---

## Productos

Objeto `Product`:
```json
{
  "id": 1,
  "slug": "con-su-nombre",
  "name": "Con su nombre",
  "description": "Con su uniforme de trabajo, sus lentes dorados y un gafete con su nombre...",
  "details": ["Lentes dorados", "Gafete personalizado", "Uniforme de trabajo"],
  "imageUrl": "/images/doll-1.jpg",
  "imageAlt": "Amigurumi de una mujer con lentes dorados, polo rojo y gafete con su nombre",
  "price": null,
  "sizeInfo": null,
  "isVisible": true,
  "sortOrder": 1,
  "categoryId": 1,
  "category": { "id": 1, "slug": "peluches", "name": "Peluches" },
  "createdAt": "2026-10-22T18:58:41.000Z",
  "updatedAt": "2026-10-22T18:58:41.000Z"
}
```

### `GET /api/products` — público

Catálogo visible, ordenado por `sortOrder` y luego por `id`. Con `?category=peluches` solo devuelve los productos de esa categoría (por su slug). Con `?includeHidden=true` y un token de admin, también devuelve los ocultos. Sin token, el parámetro se ignora.

200: `Product[]`

### `GET /api/products/{slug}` — público

200: `Product` · 404 si no existe o está oculto.

### `POST /api/products` — admin

Body (`ProductInput`):
```json
{
  "name": "Grupo personalizado",
  "description": "Teje a todo tu equipo...",
  "details": ["Varios personajes", "Cada uno personalizado"],
  "imageUrl": "/images/dolls-group.jpg",
  "imageAlt": "",
  "price": 120.5,
  "sizeInfo": "25 cm aprox.",
  "isVisible": true,
  "sortOrder": 5,
  "categoryId": 1
}
```

| Campo | Regla |
|---|---|
| `name` | obligatorio, de 2 a 120 caracteres |
| `imageUrl` | obligatorio, máximo 500 caracteres |
| `description` | máximo 2000 caracteres |
| `details` | máximo 12, de 80 caracteres cada uno. Se quitan los vacíos y los repetidos |
| `imageAlt` | si va vacío, se usa el nombre |
| `price` | de 0 a 100000, o `null` |
| `sizeInfo` | máximo 200 caracteres; vacío pasa a `null` |
| `sortOrder` | entero de 0 a 10000 |
| `categoryId` | obligatorio, id de una categoría existente |

201: el `Product` creado.

### `GET /api/products/id/{id}` — admin

200: `Product`, incluso si está oculto · 404 si no existe.

### `PUT /api/products/id/{id}` — admin

Body: `ProductInput` completo. Reemplaza el producto entero; los campos omitidos toman su valor por defecto.

200: el `Product` actualizado. Si cambió `imageUrl` y la imagen anterior era una subida que ya nadie usa, se borra.

### `DELETE /api/products/id/{id}` — admin

204 sin cuerpo. Sus detalles se borran en cascada, y su imagen subida también si nadie más la usa.

---

## Categorías

Cada producto pertenece a una categoría (Peluches, Ropa, Polos...). Al crear la base se cargan **Peluches** y **Ropa**; las demás se agregan desde el panel.

Objeto `Category`:
```json
{ "id": 1, "slug": "peluches", "name": "Peluches", "description": "", "sortOrder": 1, "productCount": 5 }
```
`productCount` cuenta los productos visibles. Con `?includeHidden=true` y un token de admin, cuenta todos.

### `GET /api/categories` — público

Categorías ordenadas por `sortOrder` y luego por `id`. Para el menú de la web.

200: `Category[]`

### `POST /api/categories` — admin

Body:
```json
{ "name": "Polos", "description": "Polos estampados y personalizados", "sortOrder": 3 }
```

| Campo | Regla |
|---|---|
| `name` | obligatorio, máximo 60 caracteres. No puede repetirse: el slug sale del nombre ("Polos" → `polos`) |
| `description` | máximo 300 caracteres |
| `sortOrder` | entero de 0 a 10000 |

201: la `Category` creada · 409 si ya existe una con ese nombre.

### `GET /api/categories/{id}` — admin

200: `Category`, contando todos sus productos · 404 si no existe.

### `PUT /api/categories/{id}` — admin

Body: el mismo de `POST`. Si cambia el nombre, cambia el slug.

200: la `Category` actualizada.

### `DELETE /api/categories/{id}` — admin

204 sin cuerpo · 409 si todavía tiene productos (primero hay que moverlos a otra categoría).

---

## Imágenes

### `POST /api/uploads` — admin

`multipart/form-data` con el campo `file`. Acepta JPG, PNG o WebP, hasta 4 MB. El tipo se comprueba por el contenido del archivo, no por la extensión.

201:
```json
{ "url": "/uploads/9b1d...e2.jpg" }
```
Esa URL es la que se envía luego como `imageUrl`, `logoUrl` o `heroImageUrl`.

### `GET /uploads/{archivo}` — público

Sirve las imágenes subidas en desarrollo local. En producción las sirve Vercel Blob.

---

## Modelo de datos (PostgreSQL)

```
site_settings (1 fila, id = 1)
categories ───────< products (category_id → categories.id, ON DELETE RESTRICT)
products ─────────< product_details (product_id → products.id, ON DELETE CASCADE)
content_items (section: highlight | step | occasion)
schema_migrations (control de migraciones)
```

El esquema completo está en [`src/lib/db/migrations.ts`](../src/lib/db/migrations.ts).
