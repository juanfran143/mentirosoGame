# Mentiroso (1 comodín) — Railway Starter

Servidor Node + Socket.IO que implementa el juego de “mentiroso” con estas reglas:
- 2 jugadores, 5 dados por jugador, 1 es comodín.
- Cada puja **sube +1** al conteo y se elige la cara (1..6).
- Si alguien puja **unos**, se bloquea a **solo unos** ("palifico en unos") hasta levantar.
- **LEVANTAR** solo es posible si ya existe una puja.
- Pierde una vida el que levanta si la puja era verdad; o el pujador si era mentira.
- 5 vidas por jugador; el perdedor de la ronda **empieza** la siguiente.

## Ejecutar local
```bash
npm install
npm start
# abre http://localhost:3000/?room=PRUEBA en 2 pestañas o móviles
```

## Desplegar en Railway (resumen)
1) Sube esta carpeta a GitHub.
2) En railway.app → “New Project” → “Deploy from Repo” y selecciona tu repo.
3) Railway detecta Node y ejecuta `npm start` en el puerto `PORT` que inyecta.
4) Abre el dominio `https://TUAPP.up.railway.app/?room=PARTIDA123` en dos teléfonos.

> Como servimos cliente y servidor en el **mismo host**, no hay CORS ni configuraciones extra.

## Estructura
```
├─ package.json
├─ server.js
└─ public/
   └─ index.html
```

## Notas
- El servidor es **autoritativo**: valida reglas, tira los dados, y solo envía **tus** dados a tu socket.
- Si un jugador se desconecta, la sala se elimina.
- Puedes estilizar `public/index.html` o migrar a un frontend propio.
