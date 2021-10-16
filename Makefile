all:
	prettier -w *.js

lint:
	npx eslint *.js
