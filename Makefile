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

webdir := ~/web/www.gigamonkeys.com/misc/js-games/


pretty:
	prettier -w *.js
	tidy -i -w 80 -m *.html

lint:
	npx eslint *.js


publish:
	cp $(files) $(webdir)
