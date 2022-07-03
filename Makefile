files := index.html
files += bingo.html
files += values.html

files += bingo.css
files += style.css

files += async.js
files += bingo.js
files += expressions.js
files += questions.js
files += random.js
files += script.js
files += values.js
files += whjqah.js

files += close.svg
files += info.svg
files += list.svg


pretty:
	prettier -w *.js *.css
	tidy -config .tidyconfig *.html

lint:
	npx eslint *.js


publish:
	./publish.sh $(files)
