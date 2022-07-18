SHELL := bash -O globstar

# Tool setup

esbuild := ./node_modules/.bin/esbuild
esbuild_opts := --bundle
esbuild_opts += --loader:.ttf=file
esbuild_opts += --minify
esbuild_opts += --outdir=./js
esbuild_opts += --sourcemap
#esbuild_opts += --format=esm # This seems to mess up Monaco.

eslint_opts := --format unix
eslint_strict_opts := --rule 'no-console: 1'

# Files

js_source := $(wildcard *.js)

worker_entry_points := vs/language/json/json.worker.js
worker_entry_points += vs/language/css/css.worker.js
worker_entry_points += vs/language/html/html.worker.js
worker_entry_points += vs/language/typescript/ts.worker.js
worker_entry_points += vs/editor/editor.worker.js

built_js := $(addprefix js/,$(js_source))
built_js += $(addprefix js/, $(worker_entry_points))

to_publish := $(shell git ls-files *.html)
to_publish += css/
to_publish += fonts/
to_publish += img/
to_publish += js/
to_publish += demo/
to_publish += assignments/

all:  build

setup:
	npm install

js/%.js: ./node_modules/monaco-editor/esm/%.js
	$(esbuild) $< $(esbuild_opts) --outbase=./node_modules/monaco-editor/esm/

js/%.js: %.js
	$(esbuild) $< $(esbuild_opts)

pretty:
	prettier -w *.js modules/*.js assignments/**/*.js demo/**/*.js css/*.css

tidy:
	tidy -config .tidyconfig *.html

lint:
	npx eslint $(eslint_opts) *.js modules/*.js

fixmes:
	ag --no-group FIXME

ready: pretty lint

strict_lint:
	npx eslint $(eslint_opts) $(eslint_strict_opts) *.js modules/*.js

build: $(built_js)

serve:
	$(esbuild) $(js_source) $(esbuild_opts) --servedir=.

publish: all
	./publish.sh $(to_publish)

clean:
	rm -rf ./js
	find . -name '*~' -delete

pristine:
	git clean -fdx


.PHONY: setup pretty lint serve publish clean pristine
