/**
 * Script para probar la conexión al endpoint de pedidos Java
 * Uso: node test-endpoint.js <numero_pedido>
 * Ejemplo: node test-endpoint.js 40996
 */

const numeroPedido = process.argv[2] || '40996';
const endpoint = `http://localhost:8080/api/v1/pedidos-produccion/${numeroPedido}`;

console.log(`\n🔍 Probando conexión al endpoint...`);
console.log(`📍 URL: ${endpoint}\n`);

fetch(endpoint)
  .then((response) => {
    console.log(`✅ Conectado! Status: ${response.status} ${response.statusText}`);
    return response.json();
  })
  .then((data) => {
    console.log(`\n📦 Respuesta recibida (${data.length} pedidos):\n`);

    data.forEach((pedido, index) => {
      console.log(`\n--- PEDIDO ${index + 1} ---`);
      console.log(`Proyecto: ${pedido.tdespacho.trim()}`);
      console.log(`Pedido: ${pedido.num.trim()}`);
      console.log(`Detalle: ${pedido.nom.substring(0, 60)}...`);
      console.log(`Cantidad: ${pedido.cant}`);
      console.log(`Pendiente: ${pedido.pend}`);
      console.log(`OP: ${pedido.opId}`);
      console.log(`Hito 0: ${pedido.fechaf0 || 'N/A'}`);
      console.log(`Hito 1: ${pedido.fechaf1 || 'N/A'}`);
    });

    console.log(`\n✅ Conexión exitosa! El endpoint responde correctamente.\n`);
  })
  .catch((error) => {
    console.error(`\n❌ Error de conexión:\n`);
    console.error(`   ${error.message}`);
    console.error(
      `\n   Verifica que:\n   - El servidor Java está corriendo en http://localhost:8080\n   - El endpoint es correcto: /api/v1/pedidos-produccion/{numero}\n\n`,
    );
  });
