# Sistema de Rotación de Cartera

Dashboard estático para GitHub Pages basado en reglas mecánicas de asignación, dinero nuevo y rotación por caída.

## Qué muestra
- NAV actual, máximo 52 semanas y drawdown
- VIX y macro manual: CAPE, PMI, LEI
- Escenario, fase operativa y señal actual
- Asignación objetivo
- Simulador de dinero nuevo
- Rotación por caída por tramos
- Validación básica del sistema
- Explicación del escenario
- Frescura de los datos
- Estado de tramos ejecutados

## Archivos principales
- `index.html`: dashboard
- `app.js`: lógica del front
- `style.css`: estilos
- `data/latest.json`: snapshot actual del sistema
- `data/nav_history.csv`: histórico NAV / máximos
- `data/manual_macro.json`: apoyo para macro manual
- `nav_check.py`: actualización de datos

## Publicación
1. Subir el contenido al repositorio.
2. Activar GitHub Pages desde la rama principal.
3. El dashboard leerá `data/latest.json` y `data/nav_history.csv`.

## Notas de funcionamiento
- La web no calcula CAPE, PMI ni LEI: los lee desde `data/latest.json`.
- La rotación por caída requiere drawdown suficiente y validación de VIX.
- El simulador de rotación permite reservar una liquidez mínima antes de calcular el tramo.
- Si faltan campos opcionales de mejora, el dashboard sigue cargando y muestra `—` solo en esos bloques.

## Alineación con el PDF
- Composición base del escenario 3 incorporada en `data/latest.json`.
- Dinero nuevo alineado a la prioridad `core -> calidad -> emergentes/small caps`.
- Rotación por caída ajustada para no usar Jupiter como destino táctico de primeras entradas.
- Reglas de rebalanceo, flash crash, reducción de riesgo y reglas críticas expuestas en el dashboard.
- Workflow de GitHub Actions movido a `.github/workflows/update-nav.yml`.
