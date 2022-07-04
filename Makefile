files := index.html
files += values.html

files += style.css

files += async.js
files += expressions.js
files += questions.js
files += random.js
files += script.js
files += values.js
files += whjqah.js

files += close.svg
files += info.svg
files += list.svg

files += bingo.*
files += booleans.js

pretty:
	prettier -w *.js *.css
	tidy -config .tidyconfig *.html

lint:
	npx eslint *.js


publish:
	./publish.sh $(files)


clean:
	find . -name '*~' -delete
