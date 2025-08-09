const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server); // mismo origen, sin CORS

// ====== LÓGICA DEL JUEGO ======
const DICE_PER_PLAYER = 5;
const START_LIVES = 5;

// roomId -> {sockets:[idA,idB], lives:[5,5], dice:[[],[]], bid:{count:0,face:0}, onesLock:false, turn:0}
const rooms = new Map();

function roll(n=DICE_PER_PLAYER) {
  return Array.from({length:n}, ()=> 1 + Math.floor(Math.random()*6));
}
function matches(dice, face){
  const ones = dice.filter(d=>d===1).length;
  if(face === 1) return ones;
  return dice.filter(d=>d===face).length + ones;
}

io.on("connection", (socket)=>{
  socket.on("join", ({roomId})=>{
    if(!roomId || typeof roomId !== "string"){
      socket.emit("error","roomId inválido");
      return;
    }
    let r = rooms.get(roomId);
    if(!r){
      r = {
        sockets: [],
        lives: [START_LIVES, START_LIVES],
        dice: [[],[]],
        bid: {count:0, face:0},
        onesLock: false,
        turn: Math.round(Math.random()) // el que perdió la ronda anterior empieza; aleatorio en la primera
      };
      rooms.set(roomId, r);
    }
    if(r.sockets.length >= 2){
      socket.emit("error","Sala llena");
      return;
    }
    r.sockets.push(socket.id);
    const me = r.sockets.indexOf(socket.id);
    socket.join(roomId);
    socket.emit("joined",{seat:me});
    if(r.sockets.length === 2){
      startRound(roomId, r.turn);
    }else{
      // avisar al que está solo que espere rival
      socket.emit("state", { lives:r.lives, bid:r.bid, onesLock:r.onesLock, turn:r.turn, waiting:true });
    }
  });

  socket.on("bid", ({roomId, face})=>{
    const r = rooms.get(roomId); if(!r) return;
    const me = r.sockets.indexOf(socket.id); if(me !== r.turn) return;
    if(typeof face !== "number" || face < 1 || face > 6) return;
    // regla de palifico en unos
    if(r.onesLock && face !== 1) return;

    if(r.bid.count === 0){
      r.bid = {count:1, face};
    } else {
      r.bid = {count: r.bid.count + 1, face};
    }
    if(face === 1) r.onesLock = true;
    r.turn = 1 - r.turn;
    broadcastState(roomId);
  });

  socket.on("call", ({roomId})=>{
    const r = rooms.get(roomId); if(!r) return;
    if(r.bid.count === 0) return; // no se puede levantar sin puja previa
    const me = r.sockets.indexOf(socket.id); if(me !== r.turn) return;

    const total = matches(r.dice[0], r.bid.face) + matches(r.dice[1], r.bid.face);
    const truth = total >= r.bid.count;

    let loser = me; // quien levanta pierde si era verdad
    if(!truth) loser = 1 - me; // mintió el pujador anterior

    r.lives[loser] -= 1;
    io.to(roomId).emit("reveal", { dice:r.dice, bid:r.bid, total, truth });

    const someoneDead = r.lives[0]===0 || r.lives[1]===0;
    if(someoneDead){
      io.to(roomId).emit("state", { lives:r.lives, bid:r.bid, onesLock:r.onesLock, turn:r.turn });
      io.to(roomId).emit("gameover", { lives:r.lives });
      rooms.delete(roomId);
      return;
    }
    // el que pierde empieza la siguiente ronda
    startRound(roomId, loser);
  });

  socket.on("disconnect", ()=>{
    for(const [roomId, r] of rooms){
      const idx = r.sockets.indexOf(socket.id);
      if(idx >= 0){
        io.to(roomId).emit("error","Jugador desconectado. La partida se cancela.");
        rooms.delete(roomId);
      }
    }
  });
});

function startRound(roomId, starter){
  const r = rooms.get(roomId); if(!r) return;
  r.turn = starter;
  r.dice = [roll(), roll()];
  r.bid = {count:0, face:0};
  r.onesLock = false;
  broadcastState(roomId);
  // enviar dados privados a cada socket
  r.sockets.forEach((sid, i)=> { io.to(sid).emit("yourDice", r.dice[i]); });
}
function broadcastState(roomId){
  const r = rooms.get(roomId); if(!r) return;
  io.to(roomId).emit("state", { lives:r.lives, bid:r.bid, onesLock:r.onesLock, turn:r.turn });
}

// ====== SERVIR CLIENTE ESTÁTICO ======
app.use(express.static("public"));

// ====== INICIAR SERVIDOR ======
const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log(`Servidor listo en :${PORT}`));
