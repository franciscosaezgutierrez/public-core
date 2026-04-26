# Sistema de Rotación de Cartera v3

---

# 0) PROPÓSITO DEL DOCUMENTO

Define:

* reglas operativas completas
* estructura objetivo
* protocolos de actuación
* mapeo con cartera real

Objetivo:
**automatización completa sin discrecionalidad**

---

# 0B) TIPOS DE DECISIÓN

El sistema distingue:

* **Estructural** → asignación objetivo
* **Táctica** → rotación por caídas
* **Flujos externos** → dinero nuevo

> Regla clave: nunca mezclar estas tres capas

---

# 1) FILOSOFÍA DEL SISTEMA

* No anticipar crisis
* No perseguir euforia
* Comprar en debilidad
* Proteger en complacencia
* Ejecutar reglas sin discrecionalidad

---

# 2) OBJETIVO

* Maximizar rentabilidad ajustada a riesgo
* Controlar drawdowns
* Aprovechar caídas
* Mantener consistencia

---

# 3) ESTRUCTURA BASE

| Activo                     | Peso   |
| -------------------------- | ------ |
| Renta Variable             | 60–62% |
| Bonos (DNCA)               | 12% objetivo / 15% límite operativo |
| Retorno Absoluto (Jupiter) | 7% objetivo / 8% límite operativo |
| Liquidez                   | 15–18% |
| Oro                        | 2-3%   |

---

## 3B) UNIVERSO OPERATIVO

### RV operativa

* Vanguard Global → Core
* Robeco BP → Calidad
* Robeco Emerging → Emergentes
* Heptagon Kopernik → Satélite

---

### RV no operativa

* Plan de pensiones

### Activo independiente

* Oro = activo independiente -> 2,5%
---

## 3C) REGLA CRÍTICA

El plan de pensiones:

* se incluye en el peso total
* **no participa en decisiones operativas**

---

## 3D) DETALLE RV

* Vanguard Global → 30%
* Robeco BP → 16%
* Heptagon Kopernik → 7%
* Robeco Emerging → 7%
* Plan pensiones → 2,5% (RV no operativa)

---

## 3E) DETALLE LIQUIDEZ

* DWS = liquidez operativa → 15%
* Groupama Trésorerie = liquidez operativa real → ~2,9%

Liquidez operativa total = DWS + Groupama

Nota X-Ray:
Groupama Trésorerie se utiliza como proxy de cash en Morningstar X-Ray,
pero es liquidez real de cartera y participa en decisiones operativas.

## 3F) PESOS OBJETIVO DEL SISTEMA

Los pesos definidos en esta sección constituyen los **pesos objetivo estructurales** (`target_weights`) del sistema.

Estos pesos:

- representan la asignación estratégica de largo plazo
- no dependen del escenario
- no cambian con dinero nuevo ni rotación
- se utilizan como referencia para:
  - control de desviaciones
  - bloqueo de compras
  - rebalanceo

### Regla clave

El sistema compara siempre:

peso_actual vs peso_objetivo

y actúa en consecuencia.

Nota de implementación:

- los pesos objetivo estructurales son la referencia principal
- los límites operativos son techos de control, no objetivos de compra
- por tanto, un límite superior no debe interpretarse como peso objetivo

---

# 4) DEFINICIÓN DE ESCENARIOS

## Código de colores

* 🟢 Expansión
* 🟡 Desaceleración
* 🟠 Sobrevaloración
* 🔴 Corrección

---

## Definición

### 🟢 Expansión

* CAPE < 28
* PMI > 52
* LEI positivo

---

### 🟡 Desaceleración

* CAPE 28–35
* LEI negativo

---

### 🟠 Sobrevaloración

* CAPE > 35

---

### 🔴 Corrección

* drawdown ≤ −10%
* o VIX > 30

---

# 5) CAPAS DEL SISTEMA

* Macro → CAPE, PMI, LEI
* Precio → drawdown
* Volatilidad → VIX

Drawdown:

(NAV actual / máximo 52 semanas) − 1

---

# 5B) CAPA DE VALORACIÓN

* CAPE → estructural
* PER global → operativo

---

## Interpretación

| CAPE | PER    | Estado        |
| ---- | ------ | ------------- |
| Alto | Alto   | Muy caro      |
| Alto | Normal | Caro moderado |
| Bajo | Bajo   | Barato        |

- Si `cape < 28` y `per_global < 15` → `"BARATO"`
- Si `cape > 35` y `per_global > 18` → `"MUY_CARO"`
- Si `cape > 35` y `15 <= per_global <= 18` → `"CARO_MODERADO"`
- Si `cape > 35` y `per_global < 15` → `"CARO_DUDOSO"`
- En cualquier otro caso → `"NEUTRO"`

---

## Regla clave

> CAPE define escenario
> PER ajusta intensidad

---

# 6) PRINCIPIO OPERATIVO

ESCENARIO → NIVEL DE RIESGO → REGLAS DE COMPRA

---

# 7) DINERO NUEVO

## 7.1 Determinación

Basado en:

* escenario
* valoración

---

## 7.1B Ajuste por valoración

La valoración ajusta la intensidad del dinero nuevo definido por escenario.

Multiplicadores:

- MUY_CARO → 0,75
- CARO_MODERADO → 0,85
- CARO_DUDOSO → 0,90
- NEUTRO → 1,00
- BARATO → 1,10

Aplicación:

inversión_final = inversión_base × multiplicador_valoración

La inversión_base corresponde al porcentaje definido en 7.2 según escenario.

Reglas clave:

- Este ajuste solo afecta al porcentaje invertido
- No modifica la distribución entre activos
- No afecta a rotación

Restricción:

- inversión_final ∈ [0%, 100%]

---

## 7.2 Asignación por escenario

### 🟢 Expansión

* 85% invertir
* 15% liquidez

RV:

* Core 45%
* Calidad 25%
* Emergentes 15%
* Kopernik 15%

---

### 🟡 Desaceleración

* 70% invertir
* 30% liquidez

RV:

* Core 50%
* Calidad 30%
* Emergentes 10%
* Kopernik 10%

Defensivo (opcional hasta 15% del tramo invertido):

* DNCA 60%
* Jupiter 40%

---

### 🟠 Sobrevaloración

* 60% invertir
* 40% liquidez

Distribución:

* RV → 40%
* Defensivo → 20%

RV:

* Core 55%
* Calidad 35%
* Emergentes 7%
* Kopernik 3%

Defensivo:

* DNCA 60%
* Jupiter 40%

---

### 🔴 Corrección

* 90% invertir
* 10% liquidez

RV:

* Core 40%
* Calidad 25%
* Emergentes 20%
* Kopernik 15%

---

## Regla clave

> El dinero nuevo nunca participa en rotación

## 7.3 Importes mínimos operativos

Cuando una compra calculada sea inferior al mínimo operativo de 100 €:

- no se ejecuta esa compra individual
- no se redistribuye automáticamente a un único activo
- el importe no ejecutado queda en liquidez operativa

Regla anti-concentración:

- Tras aplicar el mínimo de 100 €, debe haber al menos 2 activos ejecutables.
- Si queda solo 1 activo ejecutable, no se fuerza la compra.
- El importe queda en liquidez operativa.

Esta regla evita órdenes residuales y evita concentración artificial.

---

## 7.4 Algoritmo de compra por gap

Las compras no se ejecutan por distribución fija si el activo ya está en objetivo o por encima de su límite aplicable.

Para cada activo operativo:

```text
gap_i = max(0, peso_objetivo_i - peso_actual_i)
capacidad_i = max(0, límite_aplicable_i - peso_actual_i)
gap_ejecutable_i = min(gap_i, capacidad_i)
```

La compra se asigna proporcionalmente al gap ejecutable:

```text
peso_compra_i = gap_ejecutable_i / suma_gaps_ejecutables
compra_teorica_i = capital_a_desplegar × peso_compra_i
compra_ejecutable_i = compra_teorica_i si compra_teorica_i >= 100 €
```

### Reglas de ejecución

- Solo se consideran activos operativos: Core, Calidad, Emergentes y Kopernik.
- Si `peso_actual >= límite_aplicable`, el activo queda bloqueado.
- Si la orden calculada es inferior a 100 €, no se ejecuta.
- Tras aplicar el mínimo de 100 €, debe haber al menos 2 activos ejecutables para realizar compra.
- Si queda 0 o 1 activo ejecutable, no se concentra la compra en una sola línea y el importe queda en liquidez operativa.
- Si un activo alcanza su límite, el sobrante se redistribuye únicamente entre activos elegibles que sigan respetando gap, límite y mínimo operativo.
- Si no quedan activos elegibles, el sobrante queda en liquidez.
- No se fuerza inversión.

### Regla anti-concentración por mínimos

El mínimo operativo no debe provocar concentración artificial.

Ejemplo:

- Si el cálculo genera una orden inferior a 100 € en Core, esa orden se elimina.
- El sobrante no puede trasladarse automáticamente a un único activo restante.
- La redistribución solo es válida si permanecen al menos 2 activos ejecutables.
- Si no se cumple, el sobrante queda en liquidez operativa.

### Límite aplicable

El límite aplicable depende de la capa:

- dinero nuevo → límites de dinero nuevo
- rotación → límites dinámicos de rotación

### Regla clave

> Comprar solo donde existe capacidad real de compra.

---

# 8) ROTACIÓN

## 8.1 Activación

* drawdown ≤ −10%
* o VIX > 30

Nota de implementación:
- La rotación se activa por trigger de mercado, no únicamente por el código de escenario `SC4_CORRECCION`.

---

## 8.2 Intensidad por escenario

| Escenario | Intensidad |
| --------- | ---------- |
| 🟢        | baja       |
| 🟡        | media      |
| 🟠        | progresiva |
| 🔴        | agresiva   |

---

## 8.3 Distribución de compras

### 🔴 Corrección

* Core 40%
* Calidad 25%
* Emergentes 20%
* Kopernik 15%

---

### 🟠 Sobrevaloración

* Core 50%
* Calidad 30%
* Emergentes 15%
* Kopernik 5%

---

### 🟡 Desaceleración

* Core 55%
* Calidad 30%
* Emergentes 10%
* Kopernik 5%

---

### 🟢 Expansión

* Core 60%
* Calidad 30%
* Emergentes 10%

---

# 9) CONDICIÓN DE COMPRA

SI peso_actual < límite_aplicable → permitir
SI no → bloquear

El límite aplicable depende de la capa:

- dinero nuevo → límites de dinero nuevo
- rotación → límites dinámicos de rotación
- estructural → pesos objetivo

---

# 10) PRIORIDAD DE COMPRA

1. Core
2. Calidad
3. Emergentes
4. Kopernik

---

# 11) FUENTES DE CAPITAL

1. Liquidez
2. DNCA
3. Jupiter (si necesario)

---

# 11B) USO DEFENSIVO

## Principio

DNCA y Jupiter actúan como estabilizadores.

---

## Regla de uso

| Escenario | Uso      |
| --------- | -------- |
| 🟢        | no       |
| 🟡        | limitado |
| 🟠        | sí       |
| 🔴        | no       |

---

## Distribución

* DNCA 60%
* Jupiter 40%

---

## Regla crítica

DNCA y Jupiter:

* nunca participan en rotación
* nunca se compran en caídas
* solo reciben dinero nuevo en modo defensivo

---

# 12) GESTIÓN DE LIQUIDEZ

| Contexto  | Liquidez |
| --------- | -------- |
| CAPE alto | 15–20%   |
| Medio     | 12–15%   |
| Bajo      | 10–12%   |

Liquidez operativa = DWS + Groupama Trésorerie

Nota X-Ray:
Groupama Trésorerie se utiliza como proxy de cash
para representar liquidez en Morningstar X-Ray,
pero es liquidez real de cartera y participa en decisiones operativas.

---

# 13) BONOS (DNCA)

* ajuste estructural
* fuente de liquidez
* no comprar en caídas

---

# 13B) RETORNO ABSOLUTO (JUPITER)

* estabilizador
* mantener
* no usar como liquidez estructural

---

# 14) ORO

* 2–3%
* no usar en rotación
* no financiar compras

---

# 15) REBALANCEO

* ±4 pp
* mensual
* solo activos operativos

---

# 16) REDUCCIÓN DE RIESGO

Reducir RV si:

* CAPE extremo
* euforia
* VIX bajo

---

# 17) FLASH CRASH

* esperar 48h
* entrada progresiva

---

# 18) LÍMITES

| Activo   | Límite |
|----------|--------|
| RV       | ≤ 70%  |
| Liquidez | 10–25% |
| Oro      | ≤ 7%   |
| Emergentes | ≤ 8% |
| DNCA (bonos) | ≤ 15% |
| Jupiter | ≤ 8% |

Nota:
- DNCA tiene un peso objetivo estructural del 12% (ver sección 3)
- El 15% actúa como límite superior operativo (buffer)
- Jupiter tiene un peso objetivo estructural del 7% y un límite operativo del 8%
- En implementación, estos techos deben figurar como `bond_max` y `absolute_return_max`, no como objetivos de compra.

---


## 18B) Límites por capa y escenario

Los límites operativos se interpretan según la capa de decisión.

### 18B.1 Dinero nuevo

| Escenario | Core | Calidad | Emergentes | Kopernik |
|----------|------|---------|------------|----------|
| 🟢 Expansión | ≤ 32% | ≤ 17,5% | ≤ 8% | ≤ 8% |
| 🟡 Desaceleración | ≤ 30% | ≤ 16% | ≤ 8% | ≤ 7% |
| 🟠 Sobrevaloración | ≤ 30% | ≤ 16% | ≤ 8% | ≤ 7% |
| 🔴 Corrección | ≤ 30% | ≤ 16% | ≤ 8% | ≤ 7% |

Reglas:

- La flexibilidad de dinero nuevo solo aplica en expansión.
- Emergentes mantiene límite máximo del 8%.
- No se permite superar RV total máxima del 70%.
- No se permite reducir liquidez por debajo del 10%.

---

### 18B.2 Rotación

Los límites dinámicos de rotación solo aplican cuando existe trigger de mercado:

- drawdown ≤ −10%
- o VIX > 30

| Drawdown | Core | Calidad | Emergentes | Kopernik |
|----------|------|---------|------------|----------|
| > −10% | 30% | 16% | 8% | 7% |
| ≤ −10% y > −15% | 32% | 18% | 9% | 8% |
| ≤ −15% y > −20% | 34% | 19% | 10% | 9% |
| ≤ −20% | 35% | 20% | 10% | 10% |

Reglas:

- Los límites dinámicos solo aplican a rotación.
- No modifican los pesos objetivo estructurales.
- No aplican a dinero nuevo ordinario.
- No autorizan superar RV total máxima del 70%.
- No autorizan reducir liquidez por debajo del 10%.
- DNCA y Jupiter siguen sin comprarse en caídas.
- Oro y plan de pensiones siguen excluidos de la operativa.
- Cuando finaliza la corrección, los excesos no se venden automáticamente; se corrigen mediante rebalanceo posterior o nuevas aportaciones.

---

# 19) SCORE

| Indicador    | Impacto |
| ------------ | ------- |
| CAPE alto    | −1      |
| PMI < 50     | −1      |
| LEI negativo | −1      |
| VIX > 25     | +1      |

---

# 20) REGLAS CRÍTICAS

* no comprar sin trigger
* no vender en caídas
* no usar oro
* no usar Jupiter como liquidez estructural
* no comprar DNCA en caídas
* no mezclar dinero nuevo y rotación
* no forzar inversión si no hay gap suficiente
* aplicar mínimo operativo de 100 €
* el sobrante no ejecutable queda en liquidez
* no redistribuir todo el importe a un único activo ejecutable

---

# 21) MODO PAUSA

No actuar si la caída todavía no alcanza el umbral de rotación:

* drawdown > −10%
* VIX < 20

---

# 22) CONTROL DE DATOS

* NAV automático
* VIX automático

Reglas:

* sin NAV → no calcular
* sin VIX → no ejecutar
* datos obsoletos → bloquear

---

# 23) MAPEO X-RAY
Clasificación según Morningstar X-Ray

Algunos activos aparecen como "Other". Se interpretan así:

- Other 1 Oro
Activo: Invesco Physical Gold ETC
ISIN: IE00B579F325
Tratamiento:
ORO

- Other 2 Plan Pensiones
Activo: CaixaBank RV Internacional (Plan de Pensiones)
Código: N1767
Tratamiento:
Se clasifica como RENTA VARIABLE
No se usa en rotaciones

- Liquidez
Activo real:
- DWS Euro Ultra Short
- Groupama Trésorerie

Representación en X-Ray:
- Groupama Trésorerie

Tratamiento:
- DWS = LIQUIDEZ OPERATIVA
- Groupama = LIQUIDEZ OPERATIVA
- Ambos participan en decisiones operativas
- Ambos pueden ser fuente de capital en rotación
- Groupama actúa además como proxy de cash en X-Ray

## 23B) INTERPRETACIÓN DE PESOS (X-RAY)

Regla crítica:

Los porcentajes agregados de X-Ray (Distribución de Activos) pueden incluir:

- derivados
- exposiciones internas de los fondos
- efectos de netting

Por tanto:

> No deben utilizarse para decisiones operativas.

### Fuente de verdad

Para evaluar pesos reales de cartera se debe usar:

> **"Las 10 mayores posiciones"**

Esta sección refleja:

- pesos efectivos
- asignación real
- base válida para comparación con `target_weights`


# 24) FUENTES DE DATOS
Automáticos
NAV (Vanguard Global) → Yahoo Finance
VIX (^VIX) → Yahoo Finance
- Manuales
- [CAPE](https://www.multpl.com/shiller-pe)
- [PMI USA](https://tradingeconomics.com/country-list/composite-pmi)
- [LEI](https://tradingeconomics.com/united-states/leading-economic-index)
- Valoración global
- [PER global (Vanguard Global)](https://www.es.vanguard/profesionales/producto/fondo/renta-variable/9837/global-stock-index-fund-eur-acc)



# 25) FONDOS

- Renta Variable
[Vanguard Global](https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=IE00B03HCZ61)
[Robeco BP](https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=LU0203975437)
[Robeco Emerging](https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=LU0582533245)
[Heptagon Kopernik](https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=IE00BH6XSF26)

- Bonos
[DNCA](https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=LU1694789451)
- Retorno Absoluto
[Jupiter](https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=IE00BLP5S460)
- Liquidez
[DWS](https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=LU0080237943)
[Groupama(Cash)](https://www.morningstar.es/es/funds/snapshot/snapshot.aspx?id=FR0013296332)

- Oro
[Invesco Physical Gold](https://www.morningstar.es/es/etf/snapshot/snapshot.aspx?id=IE00B579F325)


# 26) OUTPUT DEL SISTEMA

Debe generar:

* escenario
* valoración
* asignación dinero nuevo
* estado de rotación
* activos permitidos
* activos bloqueados

## 26B) PESOS DE CARTERA

El sistema debe mostrar siempre:

- pesos actuales (`current_weights`)
- pesos objetivo (`target_weights`)
- desviación en puntos porcentuales
- estado por activo

### Estado por activo

- 🔴 Bloqueado → peso_actual ≥ peso_objetivo
- 🟢 Comprable → peso_actual < peso_objetivo
- ⚪ En objetivo → dentro de tolerancia

### Formato recomendado

| Activo | Actual | Objetivo | Δ (pp) | Estado |
|--------|--------|----------|--------|--------|

### Regla operativa

- No se permite comprar en activos cuyo peso actual sea igual o superior al límite aplicable
- Esta regla aplica en todas las capas operativas (dinero nuevo y rotación)
- Si tras aplicar mínimo operativo solo queda un activo ejecutable, el sistema no compra y conserva liquidez
  
---



## 26C) TARJETA DE MARCO OPERATIVO

La tarjeta de pantalla debe resumir el comportamiento operativo, no la implementación interna.

### Texto recomendado

```text
Capas:
Estructural: escenario · Táctica: rotación · Flujos: dinero nuevo
No mezclar capas

Liquidez:
Liquidez operativa: DWS 15% + cash real 2,9%
Groupama Trésorerie = proxy X-Ray
Política: CAPE alto 15–20% · medio 12–15% · bajo 10–12%
No se fuerza inversión si no hay oportunidad

Objetivo:
RV 60–62% · DNCA 12% / límite 15% · Jupiter 7% / límite 8% · Liquidez 15–18% · Oro 2,5%

Límites:
RV máx 70% · Liquidez 10–25% · Oro máx 7% · Emergentes máx 8% · límites dinámicos según capa/escenario

Rotación:
Trigger drawdown ≤ -10% / VIX > 30 · intensidad progresiva

Compras:
gap vs objetivo con límite aplicable como techo · mínimo 100 € · mínimo 2 líneas ejecutables · no forzar inversión · sobrante a liquidez

Reglas:
No vender en caídas · No usar oro · No comprar DNCA en caídas · No mezclar capas · Groupama es liquidez operativa real
```

---


## 26C) MOTIVOS DE NO COMPRA EN UI

El sistema debe explicar por qué un activo no recibe importe.

Estados posibles:

| Estado | Significado |
|--------|-------------|
| 🟢 Compra | Gap suficiente e importe ≥ 100 € |
| 🔒 Bloqueado | Peso actual igual o superior al objetivo/límite aplicable |
| ⚪ Gap bajo | Gap positivo pero inferior a 0,2 pp |
| ⚠ <100€ | Compra teórica inferior al mínimo operativo |
| ⚠ <2 líneas | Tras aplicar mínimos queda menos de dos activos ejecutables |

Regla:

- estos estados son explicativos
- no introducen discrecionalidad
- no modifican targets ni límites
- solo hacen visible la lógica del sistema

---

# 27) REGLA FINAL

El sistema decide:

* cuándo comprar
* cuánto comprar
* en qué activos comprar

sin intervención discrecional

---

## VERSIONADO

Versión: 2.7.2
Sistema completo alineado con compra por gap, mínimo operativo de 100 €, regla anti-concentración, motivos de no compra en UI, límites dinámicos por capa y marco operativo actualizado

---


---

## VERSIONADO

Versión: 2.7.2
Eliminado carry-over. Sistema simplificado: compra por gap, mínimo 100 €, mínimo 2 líneas ejecutables, sobrante a liquidez y motivos de no compra en UI.

## NOTA DE IMPLEMENTACIÓN UI

El escenario manual en pantalla solo sustituye el código de escenario efectivo. A partir de ahí debe utilizar exactamente la misma lógica que el escenario automático: `new_money_rule`, `distribution_mode = gap_weighted`, límites por capa, mínimo operativo de 100 €, mínimo de 2 líneas ejecutables y sobrante a liquidez.

`SCENARIO_ALLOCATIONS` es informativo para resumen de asignación; no debe usarse como motor de compra. La compra operativa se calcula por gap frente a `target_weights` y `applicable_limits`.
