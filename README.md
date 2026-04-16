# Sistema de Rotación de Cartera

Dashboard estático para GitHub Pages basado en reglas mecánicas de asignación, dinero nuevo y rotación por caída.

## Qué muestra
- NAV actual, máximo 52 semanas y drawdown
- VIX y macro manual: CAPE, PMI, LEI
- Escenario, fase operativa y señal actual
- Asignación objetivo
- Simulador de dinero nuevo basado en escenario con ajuste por valoración
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
- `data/manual_macro.json`: apoyo para macro manual y override opcional de escenario
- `nav_check.py`: actualización de datos

## Publicación
1. Subir el contenido al repositorio.
2. Activar GitHub Pages desde la rama principal.
3. El dashboard leerá `data/latest.json` y `data/nav_history.csv`.

## Notas de funcionamiento
- La web no calcula CAPE, PMI ni LEI: los lee desde `data/latest.json`.
- El dinero nuevo se decide por escenario, con ajuste por valoración (CAPE/PER).
- La rotación por caída usa solo capital existente.
- La secuencia de fuente para rotación es liquidez → DNCA → Jupiter.
- Si falta VIX o hay datos con antigüedad superior a 1 día, el sistema bloquea decisiones.
- Si faltan campos opcionales de mejora, el dashboard sigue cargando y muestra `—` solo en esos bloques.

## Estado de alineación con el documento maestro
- Composición base del escenario 3 implementada.
- Escenarios macro implementados.
- Rotación por drawdown implementada con prioridad core → calidad → emergentes.
- Dinero nuevo basado en escenario con ajuste por valoración.
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


## Cambios de alineación MD

- Dinero nuevo por escenario con ajuste por valoración.
- Bloqueo dinámico de compras si el peso actual ya alcanza o supera el objetivo.
- Bloqueo estricto del sistema sin NAV o sin VIX.
- Detección de flash crash con ventana de espera de 48 horas.
- Payload ampliado con pesos actuales, objetivos, desviaciones y motivos de bloqueo por activo.


## Override manual de escenario
En `data/manual_macro.json` puedes forzar el escenario sin tocar la lógica restante del sistema.

Campos:
- `scenario_override_enabled`: `true` o `false`
- `scenario_override_code`: uno de `SC1_EXPANSION`, `SC2_DESACELERACION`, `SC3_SOBREVALORACION`, `SC4_CORRECCION`

Ejemplo:
```json
{
  "scenario_override_enabled": true,
  "scenario_override_code": "SC4_CORRECCION"
}
```

Si el override está desactivado, el sistema sigue calculando el escenario automáticamente.
La interfaz muestra si el escenario activo es `Manual` o `Automático`.
