:loop
node feds.js main http://localhost:8545 side http://localhost:8545
node feds.js side http://localhost:8545 main http://localhost:8545
goto loop