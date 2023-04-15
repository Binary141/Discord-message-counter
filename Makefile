target: server

server:
	node main.js

docker:
	docker build -t discord-test .
	docker run -dt --name discord discord-test

down:
	docker stop discord
	docker rm discord
