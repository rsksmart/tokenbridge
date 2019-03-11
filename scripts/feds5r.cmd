:loop
node fed.js main http://localhost:4444 side http://localhost:4444 0
node fed.js main http://localhost:4444 side http://localhost:4444 1
node fed.js main http://localhost:4444 side http://localhost:4444 2
node fed.js main http://localhost:4444 side http://localhost:4444 3
node fed.js main http://localhost:4444 side http://localhost:4444 4

node fed.js side http://localhost:4444 main http://localhost:4444 0
node fed.js side http://localhost:4444 main http://localhost:4444 1
node fed.js side http://localhost:4444 main http://localhost:4444 2
node fed.js side http://localhost:4444 main http://localhost:4444 3
node fed.js side http://localhost:4444 main http://localhost:4444 4

goto loop
