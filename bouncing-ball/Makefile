files := $(wildcard *.html)
files += $(wildcard *.css)
files += $(wildcard *.js)

pretty:
	prettier -w *.js *.css
	tidy -config .tidyconfig *.html

publish:
	./publish.sh $(files)

clean:
	rm -rf ./js
	find . -name '*~' -delete

pristine:
	git clean -fdx


.PHONY: pretty publish clean pristine
