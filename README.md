# Dashboard NAV Vanguard

Panel web estático para GitHub Pages.

## Publicación
1. Sube estos archivos a un repositorio.
2. Activa **GitHub Pages** desde la rama principal.
3. El dashboard leerá:
   - `data/latest.json`
   - `data/nav_history.csv`

## Flujo
- `nav_check.py` actualiza los datos
- GitHub Actions ejecuta el proceso cada día laborable
- El dashboard se refresca solo con el nuevo commit
