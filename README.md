# Salto Pixel Cooperativo

Juego de plataformas 2D estilo retro hecho con HTML, CSS y JavaScript puro sobre Canvas.

## Caracteristicas

- 7 niveles jugables con scroll lateral y vertical.
- Modo solo y cooperativo local para dos jugadores.
- Cooperativo en red simulado con token usando `localStorage` y `BroadcastChannel`.
- Sprites para Mario, Luigi, Goombas, Koopas, monedas, setas, tiles y bandera.
- Power-up de seta: el jugador crece, salta un poco mas y puede romper bloques desde abajo.
- Koopas con concha empujable que arrasa enemigos.
- Musica y efectos generados con Web Audio API, sin archivos de audio externos.
- Estructura de fases separada en `levels/`.

## Ejecutar

Abre `index.html` en un navegador moderno.

## Controles

Jugador 1:

- `A` / flecha izquierda: mover izquierda.
- `D` / flecha derecha: mover derecha.
- `W` / espacio / flecha arriba: saltar.

Jugador 2 en cooperativo local:

- `J`: mover izquierda.
- `L`: mover derecha.
- `I`: saltar.

Globales:

- `P`: pausar o continuar.
- `M`: mostrar u ocultar menu.
- `S`: activar o desactivar sonido.

## Estructura

- `index.html`: entrada principal.
- `styles.css`: estilos de HUD, menu, canvas y controles tactiles.
- `game.js`: motor del juego, fisica, render, input, enemigos y cooperativo.
- `assets/used/`: assets usados por el juego.
- `levels/tools.js`: helpers para construir y registrar fases.
- `levels/level-01.js` a `levels/level-07.js`: fases individuales.

## Anadir Fases

1. Crea un nuevo archivo en `levels/`, por ejemplo `level-08.js`.
2. Usa `window.MarioLevelTools.register(() => nivel)` para registrar la fase.
3. Incluye el nuevo script en `index.html` antes de `game.js`.

Los tipos de tile actuales son:

- `0`: vacio.
- `1`: suelo.
- `2`: bloque solido rompible.
- `3`: plataforma o bloque rompible.
- `4`: moneda.
- `5`: Goomba.
- `6`: meta.
- `7`: enemigo saltarin tipo rugby.
- `8`: nube atravesable desde abajo.
- `9`: seta roja.
- `10`: Koopa verde.

## Estado

Primera version jugable.
