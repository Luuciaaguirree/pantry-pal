

# 🥗 FoodSaver — App anti-desperdicio de alimentos

## Resumen
App web instalable (PWA) que ayuda a reducir el desperdicio de alimentos mediante escaneo de tickets, inventario inteligente con alertas de caducidad, recetas adaptadas y seguimiento de ahorro. Datos en localStorage para esta versión demo, con Lovable AI para OCR de tickets y generación de recetas.

---

## Pantallas y funcionalidades

### 1. Home — "¿Qué tengo y qué debería hacer hoy?"
- **Alertas de caducidad** en la parte superior: tarjetas clicables con productos urgentes (rojo/amarillo)
- **Inventario visual** en grid: imagen, nombre, días restantes con código de colores (🟢🟡🔴)
- Botones rápidos: "Consumido" y "Eliminar" por producto
- **Botón principal flotante**: "¿Qué puedo cocinar hoy?" que lleva a recetas filtradas por inventario
- **Contador de ahorro** visible: "Has ahorrado X€ este mes"

### 2. Escáner de tickets
- Opción de capturar foto con cámara o subir imagen
- Envío a **Lovable AI** (edge function) para extraer productos, cantidades y estimar caducidades
- Pantalla de confirmación editable: el usuario puede corregir nombres, cantidades y fechas
- Al confirmar: productos se añaden al inventario, ticket se guarda en historial

### 3. Detalle de producto
- Imagen, nombre, fecha estimada de caducidad, días restantes
- **Recetas asociadas** que usan ese producto (priorizando las que usan otros productos próximos a caducar)
- Cada receta muestra: nombre, tiempo, ingredientes, botón "Ver receta"

### 4. Sección de recetas
- Categorías: Urgentes, Rápidas (<20 min), Saludables
- Recetas generadas por **Lovable AI** basándose en el inventario actual
- Adaptación dinámica: cambian según los productos disponibles

### 5. Historial de tickets
- Lista de tickets: supermercado, fecha, importe total
- Detalle: productos comprados con estado (consumido ✅ / caducado ❌)
- Ahorro por ticket: "Aprovechaste 28€, perdiste 4€"

### 6. Panel de ahorro
- Ahorro total acumulado
- Ahorro semanal/mensual con gráfico simple
- Desglose por ticket

---

## Arquitectura técnica

- **Frontend**: React + TypeScript + Tailwind + shadcn/ui
- **Datos**: localStorage (inventario, tickets, historial)
- **IA**: Edge function con Lovable AI para OCR de tickets y generación de recetas
- **PWA**: Manifest para instalabilidad (sin service worker complejo)
- **Navegación**: Bottom tab bar móvil (Home, Escáner, Recetas, Historial, Ahorro)

---

## Diseño UX/UI
- Minimalista, tipografía limpia, colores suaves con acentos verdes (eco-friendly)
- Mobile-first, interacciones de 1-2 clics máximo
- Tono cercano: mensajes tipo "El pollo caduca mañana 🍗" 
- Bottom navigation con 5 tabs e iconos claros

