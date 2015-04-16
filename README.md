Quarto is a board game for two players invented by Swiss mathematician Blaise Müller in 1991.

Players take turns choosing a piece which the other player must then place on the board.
A player wins by placing a piece on the board which forms a horizontal, vertical, or diagonal row of four pieces, all of which have a common attribute (all short, all circular, etc.).

This is a node.js / webgl multiplayers experimentation of this game.
(it means that you need to open 2 browsers to launch a game)

Made with : Blender, Three.js, radio.js

install:
- npm install
- update the server ip in js/sockets.js
- update the port in server.js

launch:
- node server.js

test:
- http://serveraddress:port/
