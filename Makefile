files := $(shell git ls-files *.js *.html *.css *.svg *.png *.woff2)
files += js

js_source := github-test.js
js_source += repl.js
js_source += login.js
js_source += new-repl.js

esbuild := ./node_modules/.bin/esbuild
esbuild_opts := --bundle
esbuild_opts += --loader:.ttf=file
esbuild_opts += --minify
esbuild_opts += --outdir=./js
esbuild_opts += --sourcemap
#esbuild_opts += --format=esm # This seems to mess up Monaco.

worker_entry_points := vs/language/json/json.worker.js
worker_entry_points += vs/language/css/css.worker.js
worker_entry_points += vs/language/html/html.worker.js
worker_entry_points += vs/language/typescript/ts.worker.js
worker_entry_points += vs/editor/editor.worker.js

built_js := $(addprefix js/,$(js_source))
built_js += $(addprefix js/, $(worker_entry_points))

all:  build

setup:
	npm install

js/%.js: ./node_modules/monaco-editor/esm/%.js
	$(esbuild) $< $(esbuild_opts) --outbase=./node_modules/monaco-editor/esm/

js/%.js: %.js
	$(esbuild) $< $(esbuild_opts)

pretty:
	prettier -w *.js modules/*.js css/*.css
	tidy -config .tidyconfig *.html

lint:
	npx eslint *.js modules/*.js

build: $(built_js)

serve:
	$(esbuild) $(js_source) $(esbuild_opts) --servedir=.

publish: all
	./publish.sh $(files)

clean:
	rm -rf ./js
	find . -name '*~' -delete

pristine:
	git clean -fdx


.PHONY: setup pretty lint serve publish clean pristine
