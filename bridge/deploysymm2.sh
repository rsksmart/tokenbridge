#!/bin/bash
truffle exec maindeploy2.js --network $1
truffle exec niamdeploy2.js --network $2
