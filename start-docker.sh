docker build -t tokenbridge:latest .
docker run --rm \
	-v $PWD/federator/db:/app/federator/db \
	-v $PWD/federator/heartbeat.log:/app/federator/heartbeat.log \
	-v $PWD/federator/config/config.js:/app/federator/built/federator/config/config.js \
	-v $PWD/federator/federator.log:/app/federator/federator.log \
	tokenbridge:latest
