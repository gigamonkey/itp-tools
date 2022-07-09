files := $(wildcard *.html)
files += $(wildcard *.css)
files += $(wildcard *.png)
files += js

esbuild := ./node_modules/.bin/esbuild
esbuild_opts := --bundle
esbuild_opts += --loader:.ttf=file
esbuild_opts += --minify
esbuild_opts += --outdir=./js
esbuild_opts += --sourcemap
esbuild_opts += --format=esm

all: js/script.js

setup:
	npm install

js/%.js: %.js$
	$(esbuild) $< $(esbuild_opts)

pretty:
	prettier -w *.js *.css
	tidy -config .tidyconfig *.html

serve:
	$(esbuild) script.js $(esbuild_opts) --servedir=.

publish: all
	./publish.sh $(files)

clean:
	rm -rf ./js
	find . -name '*~' -delete

pristine:
	git clean -fdx


.PHONY: setup pretty serve publish clean pristine
