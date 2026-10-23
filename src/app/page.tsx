const ENDPOINTS = [
  ['GET', '/api/site', 'Información del negocio'],
  ['PUT', '/api/site', 'Actualizar información (admin)'],
  ['GET', '/api/content', 'Ventajas, pasos y ocasiones'],
  ['GET', '/api/products', 'Catálogo (?category=slug para filtrar · ?includeHidden=true para admin)'],
  ['GET', '/api/products/{slug}', 'Detalle de un producto'],
  ['POST', '/api/products', 'Crear producto (admin)'],
  ['GET · PUT · DELETE', '/api/products/id/{id}', 'Leer, editar o borrar por id (admin)'],
  ['GET · POST', '/api/categories', 'Categorías con su número de productos · crear (admin)'],
  ['GET · PUT · DELETE', '/api/categories/{id}', 'Leer, editar o borrar una categoría (admin)'],
  ['POST', '/api/uploads', 'Subir imagen (admin, multipart "file")'],
  ['POST', '/api/auth/login', 'Iniciar sesión → JWT'],
];

/** Small index so opening the API in a browser explains what it is. */
export default function Home() {
  return (
    <main>
      <h1>Valex API</h1>
      <p>API REST de Creaciones Valery&apos;s. La web pública y el panel de administración están en el proyecto Angular.</p>
      <table cellPadding={6}>
        <tbody>
          {ENDPOINTS.map(([method, path, description]) => (
            <tr key={method + path}>
              <td><code>{method}</code></td>
              <td><code>{path}</code></td>
              <td>{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
