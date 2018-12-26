:loop
node feds.js main http://localhost:4444 side http://localhost:4444
node feds.js side http://localhost:4444 main http://localhost:4444
goto loop