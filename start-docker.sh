#!/bin/sh

docker build --no-cache -t tokenbridge:latest .

docker run --rm \
	-v $PWD/federator/config/config.js:/app/federator/built/federator/config/config.js \
	tokenbridge:latest
