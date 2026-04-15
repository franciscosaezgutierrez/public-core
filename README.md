# Sistema de Rotación de Cartera

Dashboard estático para GitHub Pages basado en reglas mecánicas de asignación, dinero nuevo y rotación por caída.

## Qué muestra
- NAV actual, máximo 52 semanas y drawdown
- VIX y macro manual: CAPE, PMI, LEI
- Escenario, fase operativa y señal actual
- Asignación objetivo
- Simulador de dinero nuevo basado en CAPE
- Rotación por caída por tramos
- Validación del sistema y bloqueo de decisiones
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
- El dinero nuevo se decide por CAPE, no por escenario.
- La rotación por caída usa solo capital existente.
- La secuencia de fuente para rotación es liquidez → DNCA → Jupiter.
- Si falta VIX o hay datos con antigüedad superior a 1 día, el sistema bloquea decisiones.
- Si faltan campos opcionales de mejora, el dashboard sigue cargando y muestra `—` solo en esos bloques.

## Estado de alineación con el documento maestro
- Composición base del escenario 3 implementada.
- Escenarios macro implementados.
- Rotación por drawdown implementada con prioridad core → calidad → emergentes.
- Dinero nuevo basado estrictamente en CAPE.
- Uso defensivo implementado: 60% DNCA / 40% Jupiter.
- Jupiter incorporado como tercera fuente de rotación.
- Bloqueo automático por datos > 1 día y por ausencia de VIX.
- Reducción de riesgo completa con condición de mercado +20% desde mínimo.
- Tolerancias de rebalanceo por bloque expuestas en el payload.
- Workflow documentado sin rutas erróneas.


## v2.4.1 integrada
- Añadidos `config.py` y `engine.py`.
- `nav_check.py` ahora es el motor principal alineado con el MD cerrado.
- `app.js` mantiene compatibilidad con el dashboard existente y prioriza la lógica calculada en `data/latest.json`.
- No usar `main.py`: en este proyecto el ejecutor sigue siendo `nav_check.py`.
