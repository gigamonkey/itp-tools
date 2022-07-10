files := $(shell git ls-files *.js *.html *.css *.svg *.png)

pretty:
	prettier -w *.js *.css
	tidy -config .tidyconfig *.html

lint:
	npx eslint *.js

publish:
	./publish.sh $(files)

clean:
	find . -name '*~' -delete
