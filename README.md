# Sistema de Rotación de Cartera v2.3

Dashboard estático para GitHub Pages basado en reglas mecánicas de asignación, dinero nuevo y rotación por caída.

## Qué cambia en la v2.3

- Alineación explícita con el documento maestro `INV-Rotacion.md`.
- Motor de escenario estructural consolidado en `nav_check.py`.
- Valoración compuesta integrada: **CAPE + PER global**.
- Regla de dinero nuevo alineada al estado de valoración, no solo al CAPE.
- Motor de rotación por tramos con buckets definidos y estado persistente.
- Fase operativa separada de escenario estructural.
- Payload `latest.json` ampliado para que el front no rehaga lógica crítica.
- Fallback operativo: si Yahoo falla, reutiliza el último dato válido para no romper el dashboard.
- Versión de proyecto incluida en `latest.json`.

## Qué muestra

- NAV actual, máximo 52 semanas y drawdown.
- VIX y macro manual: CAPE, PMI, LEI, PER global.
- Escenario estructural, fase operativa y señal actual.
- Asignación objetivo por escenario.
- Dinero nuevo basado en valoración compuesta.
- Rotación por caída por tramos.
- Validación del sistema y bloqueo de decisiones.
- Frescura de los datos.
- Estado de buckets ejecutados.

## Archivos principales

- `index.html`: dashboard.
- `app.js`: render del front basado en `latest.json`.
- `style.css`: estilos.
- `data/latest.json`: snapshot actual del sistema.
- `data/nav_history.csv`: histórico NAV / máximos.
- `data/manual_macro.json`: apoyo para macro manual.
- `nav_check.py`: actualización de datos y motor de reglas.
- `nav_check_v22_backup.py`: copia de seguridad de la versión previa.

## Reglas operativas ya integradas

- Separación de capas: estructural / táctica / flujos.
- Escenarios 1–4.
- Dinero nuevo según estado de valoración.
- Rotación por drawdown con validación por VIX.
- Prioridad de compra: core → calidad → emergentes.
- Fuente de rotación: liquidez → DNCA → Jupiter.
- Modo pausa.
- Reducción de riesgo.
- Tolerancias de rebalanceo expuestas en el payload.
- Reglas críticas y checklist operativo expuestos en el payload.

## Publicación

1. Subir el contenido al repositorio.
2. Activar GitHub Pages desde la rama principal.
3. El dashboard leerá `data/latest.json` y `data/nav_history.csv`.

## Notas

- CAPE, PMI, LEI y PER global siguen siendo inputs manuales.
- El front ya no debe reinterpretar reglas críticas que ya estén resueltas en `latest.json`.
- Si falla la descarga de Yahoo, el script reutiliza el último dato disponible.
