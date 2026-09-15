---
lang: es
author: Ejemplo
---

# Perfil Markdown

Este muestrario reúne el perfil común. Las marcas dentro del código son literales.
La bibliografía de ejemplo está en `markdown-profile.bib`; se puede cargar desde las opciones de citas.

## Texto y énfasis

Puntuación literal: "Texto" ... -- --- y «comillas»…

**Negrita**, *cursiva*, ~~tachado~~, H~2~O y m^2^.

## Enlaces e imágenes

[Enlace explícito](https://example.org/explicit) y https://example.org/bare

[Enlace con título](https://example.org/title "Título del enlace"), <https://example.org/angle> y [enlace por referencia][sitio].

[sitio]: https://example.org/reference "Referencia"

![Píxel](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)

## Listas y tareas

- Elemento
  - Anidado

1. Primero
2. Segundo

- [ ] Pendiente
- [x] Hecho

> Una cita en bloque.

## Tablas

| Sustancia | Área |
| --- | --- |
| H~2~O | m^2^ |

| Izquierda | Centro | Derecha |
| :--- | :---: | ---: |
| **Negrita en celda** | *Cursiva en celda* | 123 |
| A \| B | [Enlace en celda](https://example.org/cell) | 45 |
| Vacía a la derecha | H~2~O | |
| Código en celda | `a + b` | 7 |

## Fórmulas

En línea $a^2$ y \(b^2\).

$$
c^2
$$

\[
d^2
\]

## Notas y bibliografía

Una nota[^nota]. Una referencia bibliográfica [@ejemplo2026].

Otra llamada a la misma nota[^nota] y una nota de dos párrafos[^larga].

Cita narrativa: @ejemplo2026. Solo año: [-@ejemplo2026].

Cita múltiple: [@ejemplo2026; @segunda2025]. Con página: [@ejemplo2026, p. 12].

[^nota]: Explicación con **énfasis**.

[^larga]: Primer párrafo de la nota larga.

    Segundo párrafo con *cursiva en nota*.

## Código y caracteres literales

Literal: `H~2~O`, `[@ejemplo2026]` y `[^nota]`.

```text
"Texto" ... -- ---
H~2~O y $a^2$
```

````markdown
# Esto es código, no un título
```js
const x = "literal";
```
| Esto | No es una tabla |
````

Escapados: \*sin cursiva\*, \~2\~, \^3\^ y \#sin título.

## Párrafos y saltos

Primera línea del mismo párrafo
segunda línea del mismo párrafo.

Primera línea con salto visible.  
Segunda línea con salto visible.

Un párrafo independiente.

## Encabezados de todos los niveles

### Ejemplo H3

#### Ejemplo H4

##### Ejemplo H5

###### Ejemplo H6

## Separador horizontal

---

Final del documento.
