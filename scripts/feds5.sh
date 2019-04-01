while true
do
    node fed.js main side  0
    node fed.js main side  1
    node fed.js main side  2
    node fed.js main side  3
    node fed.js main side  4

    node fed.js side main  0
    node fed.js side main  1
    node fed.js side main  2
    node fed.js side main  3
    node fed.js side main  4
    
    sleep 1
done
